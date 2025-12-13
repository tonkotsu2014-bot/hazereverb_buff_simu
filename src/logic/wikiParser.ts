export interface SkillEffect {
    type: 'Buff' | 'Debuff';
    calculationType: 'Fixed' | 'SupportScaling' | 'Scaling';
    attribute: string; // Internal key (e.g. 'Attack', 'CritDamage')
    value: number;
    duration?: number;
    scalingFactor?: string;
}

export interface SkillData {
    name: string;
    levels: { level: string; description: string | null; effects: SkillEffect[] }[];
}

export interface CharacterStats {
    hp: string;
    attack: string; // 攻撃力/支援力
    defense: string;
    critRate: string;
    critDamage: string;
    speed: string;
}

export interface ParsedCharacterData {
    name?: string;
    type?: string;
    skills: SkillData[];
    stats?: CharacterStats;
}

const parseStats = (doc: Document): CharacterStats | undefined => {
    const wikiBody = doc.getElementById('wikibody');
    if (!wikiBody) return undefined;

    const tables = Array.from(wikiBody.querySelectorAll('table'));

    // Find the stats table. Heuristic: Header contains 'HP' and '機動力'
    const statsTable = tables.find(table => {
        const headerText = table.querySelector('thead')?.textContent || '';
        return headerText.includes('HP') && headerText.includes('機動力') && headerText.includes('Lv');
    });

    if (!statsTable) return undefined;

    const tbody = statsTable.querySelector('tbody') || statsTable;
    // Get all rows in tbody (excluding thead rows if they are inside tbody, though usually they are separate)
    // Actually, just query trs from tbody
    const rows = Array.from(tbody.querySelectorAll('tr'));

    // Flattening logic
    const numCols = 11; // Based on known header count
    const rowValues: string[] = new Array(numCols).fill('');
    const rowSpans: number[] = new Array(numCols).fill(0);

    // We only care about the final state after processing all rows to get likely the "Max Level" row
    // However, sometimes the max level is not the absolute last row if there are footnotes?
    // But usually for these wikis, the table ends with the max level.

    rows.forEach(row => {
        // Skip header rows if they are in the list (e.g. if we queried table.querySelectorAll('tr') and didn't exclude thead)
        if (row.parentElement?.tagName === 'THEAD') return;
        if (row.querySelector('th')) return; // Skip sub-headers inside table

        const cells = Array.from(row.querySelectorAll('td'));
        let cellIndex = 0;

        for (let col = 0; col < numCols; col++) {
            if (rowSpans[col] > 0) {
                rowSpans[col]--;
                // Value persists from previous row assignment
            } else {
                if (cellIndex < cells.length) {
                    const cell = cells[cellIndex];
                    rowValues[col] = cell.textContent?.trim() || '';
                    if (cell.rowSpan > 1) {
                        rowSpans[col] = cell.rowSpan - 1;
                    }
                    cellIndex++;
                } else {
                    // No more cells, maybe empty column
                    rowValues[col] = '';
                }
            }
        }
    });

    // Extract mapped values
    // Map: Name(0), Type(1), Stars(2), Lv(3), HP(4), Atk(5), Def(6), Crit(7), CritDmg(8), Spd(9), Awake(10)

    // Basic validation: ensure we have something
    if (!rowValues[4]) return undefined;

    return {
        hp: rowValues[4],
        attack: rowValues[5],
        defense: rowValues[6],
        critRate: rowValues[7],
        critDamage: rowValues[8],
        speed: rowValues[9]
    };
};

export const parseSkills = (doc: Document): SkillData[] => {
    const wikiBody = doc.getElementById('wikibody');
    if (!wikiBody) return [];

    const skills: SkillData[] = [];
    const tables = wikiBody.querySelectorAll('table');

    tables.forEach(table => {
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        // console.log('Checking table:', table.outerHTML.substring(0, 100)); // excessive

        if (thead && tbody) {
            const headers = Array.from(thead.querySelectorAll('th'));
            const skillNameHeader = headers.find(th => th.textContent?.includes('スキル'));

            if (skillNameHeader) {
                let skillName = skillNameHeader.textContent?.trim() || 'Unknown Skill';
                skillName = skillName.replace(/<!--.*?-->/g, '').trim();

                let isEx = skillName.includes('Ex') || skillName.includes('EX');

                // If found header is literally just "Exスキル", try to find name in other header
                if (skillName === 'Exスキル' && headers.length > 1) {
                    const otherHeader = headers.find(th => th !== skillNameHeader);
                    if (otherHeader) {
                        const otherName = otherHeader.textContent?.replace(/<!--.*?-->/g, '').trim();
                        if (otherName) {
                            skillName = otherName;
                            // Ensure isEx is true since we found the "Exスキル" marker previously
                            isEx = true;
                        }
                    }
                }

                const levels: { level: string; description: string | null; effects: SkillEffect[] }[] = [];
                const rows = tbody.querySelectorAll('tr');

                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length === 1) {
                        const content = cells[0].textContent?.trim() || '';
                        // If content is just digits, treat it as a level
                        if (/^\d+$/.test(content)) {
                            levels.push({ level: content, description: null, effects: [] });
                        } else if (content) {
                            // Fallback for "legacy" description parsing or Ex skill special cases
                            // Only add if it looks like a description (not a number)
                            const levelObj = { level: isEx ? 'Ex' : '1', description: content, effects: [] };
                            levels.push(levelObj);
                        }
                    } else if (cells.length >= 2) {
                        const level = cells[0].textContent?.trim() || '';
                        const description = cells[1].textContent?.trim() || '';
                        if (level && description) {
                            levels.push({ level, description, effects: [] });
                        }
                    }
                });

                if (levels.length > 0) {
                    skills.push({ name: skillName, levels });
                }
            }
        }
    });

    return skills;
};

const parseBasicInfo = (doc: Document): { name?: string; type?: string } => {
    const wikiBody = doc.getElementById('wikibody');
    if (!wikiBody) return {};

    const tables = Array.from(wikiBody.querySelectorAll('table'));
    const basicInfoTable = tables.find(table => {
        const headerText = table.querySelector('thead')?.textContent || '';
        return headerText.includes('キャラクター名称') && headerText.includes('タイプ');
    });

    if (!basicInfoTable) return {};

    const rows = basicInfoTable.querySelectorAll('tbody tr');
    if (rows.length === 0) return {};

    const firstRow = rows[0];
    const cells = firstRow.querySelectorAll('td');

    // Name is usually the first cell
    let name: string | undefined;
    if (cells.length > 0) {
        const tempDiv = doc.createElement('div');
        tempDiv.innerHTML = cells[0].innerHTML.replace(/<br\s*\/?>/gi, ' ');
        name = tempDiv.textContent?.trim().replace(/\s+/g, ' ');
    }

    // Type is usually the second cell
    let type: string | undefined;
    if (cells.length > 1) {
        type = cells[1].textContent?.trim();
    }

    return { name, type };
};

// Exporting for testing purposes

const ATTRIBUTE_MAP: { [key: string]: string } = {
    '攻撃力': 'Attack',
    '支援力': 'Support',
    '防御力': 'Armor',
    '装甲': 'Armor',
    '装甲値': 'Armor',
    // 'HP': 'MaxHP', // Excluded
    // '体力': 'MaxHP', // Excluded
    // '体力値': 'MaxHP', // Excluded
    'クリティカル': 'CritRate',
    'クリティカル率': 'CritRate',
    '会心率': 'CritRate',
    'クリティカルダメージ': 'CritDamage',
    '会心ダメージ': 'CritDamage',
    'ダメージ軽減': 'DamageReduction',
    'ダメージ軽減率': 'DamageReduction',
    'ダメージ回避': 'Evasion',
    'ダメージ回避率': 'Evasion',
    'ハイパークリティカルダメージ': 'CritDamage',
    '機動力': 'Mobility',
    // '効果命中': 'EffectHitRate', // Excluded
    // '効果抵抗': 'EffectResist', // Excluded
};

export const processSkillAttributes = (skills: SkillData[]): SkillData[] => {
    return skills.map(skill => ({
        ...skill,
        levels: skill.levels.map(levelObj => {
            const { description } = levelObj;
            let effects: SkillEffect[] = [];

            if (description) {
                // Stateful Sentence Parsing
                // Split by period or newline. DO NOT split by comma as strictly as before, 
                // because comma is used to list effects sharing a verb.
                const sentences = description.split(/[。\n]+/);

                // Buffer to hold effects found in the current "thought unit" until a duration is found
                let pendingEffects: SkillEffect[] = [];
                // Buffer to hold effects that are waiting for a verb (e.g. "A is 10%, B is 20% UP")
                let verbPendingEffects: Partial<SkillEffect>[] = [];
                let lastDuration: number | undefined;

                // Helper to identify attribute from raw string
                const extractAttribute = (raw: string): string | undefined => {
                    // 1. Try to clean up known prefixes/separators
                    let clean = raw.split(/[、,♦]/).pop()?.trim() || raw;
                    clean = clean.replace(/^(?:永続的に|敵の|自身の|味方の|ターゲットの|すべての味方の)+/, '');

                    // 2. Direct lookup
                    if (ATTRIBUTE_MAP[clean]) return ATTRIBUTE_MAP[clean];

                    // 3. Suffix lookup (Iterate over all keys and see if 'clean' ends with one of them)
                    // Sort keys by length descending to match longest possible attribute first (e.g. "会心ダメージ" before "ダメージ")
                    const sortedKeys = Object.keys(ATTRIBUTE_MAP).sort((a, b) => b.length - a.length);
                    for (const key of sortedKeys) {
                        if (clean.endsWith(key)) {
                            return ATTRIBUTE_MAP[key];
                        }
                    }
                    return undefined;
                };

                sentences.forEach((sentence) => {
                    if (!sentence.trim()) return;

                    // Helper to flush verb pending effects
                    const flushVerbPending = (isDecrease: boolean) => {
                        verbPendingEffects.forEach(partial => {
                            pendingEffects.push({
                                ...partial,
                                type: isDecrease ? 'Debuff' : 'Buff',
                            } as SkillEffect);
                        });
                        verbPendingEffects = [];
                    };

                    // 1. Extract Effects in this sentence
                    // Pattern allows generic verb OR comma/connective
                    // Updated to allow [がを]
                    const fixedPattern = /([^\x00-\x7F]+?)(?:が|を)(\d+)%(?:(増加|上昇|アップ|低下|減少|ダウン)|([、,]))/g;
                    const fixedMatches = [...sentence.matchAll(fixedPattern)];
                    fixedMatches.forEach(m => {
                        const attrRaw = m[1];
                        const value = parseInt(m[2], 10);
                        const attrKey = extractAttribute(attrRaw);

                        if (attrKey) {
                            const verb = m[3];

                            if (verb) {
                                const isDecrease = ['低下', '減少', 'ダウン'].includes(verb);
                                // Resolve any pending verb-less effects
                                flushVerbPending(isDecrease);

                                pendingEffects.push({
                                    type: isDecrease ? 'Debuff' : 'Buff',
                                    calculationType: 'Fixed',
                                    attribute: attrKey,
                                    value: value
                                });
                            } else {
                                // It's a comma-separated list item, wait for verb
                                verbPendingEffects.push({
                                    calculationType: 'Fixed',
                                    attribute: attrKey,
                                    value: value
                                });
                            }
                        }
                    });

                    const genericScalingPattern = /([^\x00-\x7F]+?)(?:が|を)([^\x00-\x7F]*?)\s*[x×]\s*(\d+)%?(?:分)?(?:(増加|上昇|アップ|低下|減少|ダウン|獲得)|([、,]))/g;
                    const genericScalingMatches = [...sentence.matchAll(genericScalingPattern)];
                    genericScalingMatches.forEach(m => {
                        const attrRaw = m[1];
                        const scalingFactor = m[2];
                        const value = parseInt(m[3], 10);
                        const attrKey = extractAttribute(attrRaw);

                        if (attrKey) {
                            const verb = m[4];

                            if (verb) {
                                const isDecrease = ['低下', '減少', 'ダウン'].includes(verb);
                                // Resolve any pending verb-less effects
                                flushVerbPending(isDecrease);

                                const isSupport = scalingFactor.includes('支援力');
                                pendingEffects.push({
                                    type: isDecrease ? 'Debuff' : 'Buff',
                                    calculationType: isSupport ? 'SupportScaling' : 'Scaling',
                                    attribute: attrKey,
                                    value: value,
                                    scalingFactor: isSupport ? undefined : scalingFactor
                                });
                            } else {
                                // It's a comma-separated list item, wait for verb
                                const isSupport = scalingFactor.includes('支援力');
                                verbPendingEffects.push({
                                    calculationType: isSupport ? 'SupportScaling' : 'Scaling',
                                    attribute: attrKey,
                                    value: value,
                                    scalingFactor: isSupport ? undefined : scalingFactor
                                });
                            }
                        }
                    });

                    // 2. Extract Duration in this sentence
                    // Look for "Xターン持続" or "永続"
                    let duration: number | undefined;
                    // Check for permanent first
                    if (sentence.includes('永続')) {
                        duration = -1;
                    } else {
                        const dMatch = sentence.match(/(\d+)ターン(?:持続|の間)/);
                        if (dMatch) {
                            duration = parseInt(dMatch[1], 10);
                        }
                    }

                    // 3. Resolution
                    // If we found a duration in this sentence, assign it to ALL pending effects 
                    // (including those from previous sentences that haven't been resolved yet).
                    if (duration !== undefined) {
                        pendingEffects.forEach(e => e.duration = duration);
                        effects.push(...pendingEffects);
                        pendingEffects = [];
                        lastDuration = duration;
                    }
                    // If no duration is found, the effects remain pending. 
                    // They might be resolved by a subsequent sentence (e.g. "Effect A. Effect B. This lasts 3 turns.")
                });


                // Cleanup: If there are any pending effects left after processing all sentences,
                // push them without a duration (or undefined duration).
                if (pendingEffects.length > 0) {
                    if (lastDuration !== undefined) {
                        pendingEffects.forEach(e => e.duration = lastDuration);
                    }
                    effects.push(...pendingEffects);
                }
            }

            return {
                ...levelObj,
                effects
            };
        })
    }));
};

export const parseCharacterData = (html: string): ParsedCharacterData => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    let skills = parseSkills(doc);
    skills = processSkillAttributes(skills); // Post-processing step

    const stats = parseStats(doc);
    const { name, type } = parseBasicInfo(doc);

    return { skills, stats, name, type };
};
