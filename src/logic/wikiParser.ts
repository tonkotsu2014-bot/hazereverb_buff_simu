
export interface SkillEffect {
    type: string; // 'Buff' | 'Debuff'
    attribute: string;
    value: number;
    duration?: number;
    calculationType?: string; // Made optional to fit existing usage or ensure alignment
    scalingFactor?: string;
    target?: string; // 'Default' | 'Self' | 'AllAllies' etc.
    isStackable?: boolean;
}

export interface SkillLevel {
    level: string;
    description: string | null;
    effects: SkillEffect[];
}

export interface SkillData {
    name: string;
    levels: SkillLevel[];
}

export interface CharacterStats {
    hp: string;
    attack: string;
    defense: string;
    critRate: string;
    critDamage: string;
    speed: string;
}

export interface ParsedCharacterData {
    name?: string;
    type?: string;
    role?: string; // Added for edit form
    attackRange?: { row: number; col: number }; // Added for edit form
    skills: SkillData[];
    stats?: CharacterStats | { [key: string]: number }; // Allow number stats for editing
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

                const cleanDescription = (cell: Element): string => {
                    const tempDiv = doc.createElement('div');
                    tempDiv.innerHTML = cell.innerHTML;
                    const text = tempDiv.textContent || '';
                    return text.replace(/\s+/g, '');
                };

                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length === 1) {
                        const content = cells[0].textContent?.trim() || '';
                        // If content is just digits, treat it as a level
                        if (/^\d+$/.test(content)) {
                            levels.push({ level: content, description: null, effects: [] });
                        } else if (content) {
                            // Fallback for "legacy" description parsing or Ex skill special cases
                            // Use cleaner for content if possible, but cells[0] is content here.
                            const desc = cleanDescription(cells[0]);
                            const levelObj = { level: isEx ? 'Ex' : '1', description: desc, effects: [] };
                            levels.push(levelObj);
                        }
                    } else if (cells.length >= 2) {
                        const level = cells[0].textContent?.trim() || '';
                        // Use cleanDescription for the second cell
                        const description = cleanDescription(cells[1]);
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
    'HP': 'Hp',
    '体力': 'Hp',
    '体力値': 'Hp',
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
    '攻撃': 'Attack',
    '支援': 'Support',
    '防御': 'Armor',
    '機動': 'Mobility',
    // '効果命中': 'EffectHitRate', // Excluded
    // '効果抵抗': 'EffectResist', // Excluded
};

export const parseAttribute = (raw: string): string | undefined => {
    // 1. Try to clean up known prefixes/separators
    let clean = raw.split(/[、,♦]/).pop()?.trim() || raw;
    clean = clean.replace(/\s+/g, ''); // Remove internal spaces (handling noise like "クリ  ティカル")
    clean = clean.replace(/^(?:永続的に|敵の|自身の|味方の|ターゲットの|すべての味方の)+/, '');
    clean = clean.replace(/[【】\[\]]/g, ''); // Strip brackets

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

// --- Extended Parsing Helpers ---

// Parses the "Awakening Status" column from Table 1
export const parseAwakeningStats = (doc: Document): { [key: string]: number } => {
    const stats: { [key: string]: number } = {};
    const wikiBody = doc.getElementById('wikibody');
    if (!wikiBody) return stats;

    // Find the stats table (same heuristic as parseStats or just look for '覚醒時ステータス')
    const tables = Array.from(wikiBody.querySelectorAll('table'));
    const statsTable = tables.find(table => {
        const headerText = table.querySelector('thead')?.textContent || '';
        return headerText.includes('覚醒時ステータス');
    });

    if (!statsTable) return stats;

    const rows = Array.from(statsTable.querySelectorAll('tbody tr'));
    // We are looking for the content under "覚醒時ステータス".
    // In monika.html it is the last column.

    // Iterate rows to find text in the relevant column.
    // Since rowspan might make it tricky, we just look for text containing '+'.
    // A more robust way: Find the column index of '覚醒時ステータス'
    const headers = Array.from(statsTable.querySelectorAll('thead th'));
    const awakeIndex = headers.findIndex(th => th.textContent?.includes('覚醒時ステータス'));

    if (awakeIndex === -1) return stats;

    // The logic to respect rowspans matches parseStats. 
    // However, usually the awakening stat is listed once (with rowspan).
    // We can collect ALL awakening stat texts found in that column and take the "max" or "last" one?
    // Or just accumulate all unique ones?
    // In Monika's case: "HP+884\nSupport+9".
    // We can just parse the text content of any cell in that column that has content.

    // Simplification: Grab all text from that column across all rows.
    // Requires handling rowspans properly to identify which cell belongs to that column.
    // Re-using the flatten logic from parseStats would be ideal, but let's just do a specific search.
    // Or, since we just want the value, maybe regex the entire table content for that column? No.

    // Let's iterate rows and try to find the cell.
    // For each row, count cells. 
    // This is hard without full table matrix.
    // Let's try to just find cells that look like awakening stats in that table.
    // "HP+884" etc.

    // Actually, let's use the 'parseStats' flattening logic idea but simpler.
    // Just find any cell in that table that contains "+" and looks like stats?
    // Or closer: Parse text content of the cell at index 10 (if 11 cols).
    // But index shifts.

    // Let's assume the standard 11 col layout for now, or use the header map.
    // For Monika, it is the last column.

    const cellTexts: string[] = [];
    rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        cells.forEach(cell => {
            // Heuristic: If it contains known stat names and '+', it might be it.
            const text = cell.textContent || '';
            if (text.includes('+') && (text.includes('HP') || text.includes('支援') || text.includes('攻撃') || text.includes('体') || text.includes('会心') || text.includes('機動'))) {
                cellTexts.push(text);
            }
        });
    });

    // Parse the collected texts
    cellTexts.forEach(text => {
        // Use matchAll to find all "Stat+Value" occurrences
        // Pattern: (StatName)(+)(Value)(optional %)
        // But the input might be "HP+884支援力+9".
        // Using global regex.
        // Also handle potential spaces.
        const matches = [...text.matchAll(/([^\+\d\s]+)\+?(\d+)/g)];
        matches.forEach(m => {
            const attrName = m[1];
            const val = parseInt(m[2], 10);
            const attrKey = parseAttribute(attrName);
            if (attrKey && !isNaN(val)) {
                // Take max value found
                stats[attrKey] = Math.max(stats[attrKey] || 0, val);
            }
        });
    });

    return stats;
};

// Parses Table 2: Equipment
export const parseEquipmentStats = (doc: Document): { [key: string]: number } => {
    const stats: { [key: string]: number } = {};
    const wikiBody = doc.getElementById('wikibody');
    if (!wikiBody) return stats;

    const tables = Array.from(wikiBody.querySelectorAll('table'));
    const eqTable = tables.find(table => {
        const headerText = table.querySelector('thead')?.textContent || '';
        return headerText.includes('装備1') && headerText.includes('装備2');
    });

    if (!eqTable) return stats;

    // Usually Row 2 has the values.
    const rows = Array.from(eqTable.querySelectorAll('tbody tr'));
    rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        cells.forEach(cell => {
            const text = cell.textContent || '';
            // Example: "支援1～10%"
            // We want Max: 10.
            const match = text.match(/([^\d~～]+).*?[~～](\d+)%/); // greedy match for numbers?
            // "支援1～10%" -> Group 1: "支援", Group 2: "10"
            // Note: "1～10%" part might be "1~10%".

            if (match) {
                const attrName = match[1];
                const maxVal = parseInt(match[2], 10);
                const attrKey = parseAttribute(attrName);
                if (attrKey && !isNaN(maxVal)) {
                    // Sum up if multiple slots give same stat?
                    // "Equipment 1: Support 10%", "Equipment 3: Support 10%".
                    // User said "Add...". So total is 20% likely.
                    stats[attrKey] = (stats[attrKey] || 0) + maxVal;
                }
            } else {
                // Try parsing multiple "Stat +10%" entries
                const matches = [...text.matchAll(/([^\d\+]+)\+?(\d+)%/g)];
                matches.forEach(m => {
                    const attrName = m[1].trim();
                    const val = parseInt(m[2], 10);
                    const attrKey = parseAttribute(attrName);
                    if (attrKey && !isNaN(val)) {
                        stats[attrKey] = (stats[attrKey] || 0) + val;
                    }
                });
            }
        });
    });

    return stats;
};

// Parses Table 3: Bond
export const parseBondStats = (doc: Document): { [key: string]: number } => {
    let stats: { [key: string]: number } = {};
    const wikiBody = doc.getElementById('wikibody');
    if (!wikiBody) return stats;

    const tables = Array.from(wikiBody.querySelectorAll('table'));
    const bondTable = tables.find(table => {
        const headerText = table.querySelector('thead')?.textContent || '';
        return headerText.includes('好感度') && headerText.includes('ステータス');
    });

    if (!bondTable) return stats;

    const rows = Array.from(bondTable.querySelectorAll('tbody tr'));
    let maxLevel = -1;

    rows.forEach(row => {
        const cells = Array.from(row.querySelectorAll('td'));
        // Cell 1 is Level (好感度), Cell 2 is Status
        if (cells.length >= 2) {
            const levelText = cells[0].textContent?.trim() || '0';
            const level = parseInt(levelText, 10);

            if (!isNaN(level) && level > maxLevel) {
                maxLevel = level;
                // Reset stats for new max level
                stats = {};

                const text = cells[1].textContent || '';
                // "支援+1", "支援+2,機動力+5%"
                const parts = text.split(/[,、]+/);
                parts.forEach(part => {
                    const clean = part.trim();
                    // Check if percentage
                    const matchPercent = clean.match(/([^\+]+)\+(\d+)%/);
                    if (matchPercent) {
                        const attrName = matchPercent[1];
                        const val = parseInt(matchPercent[2], 10);
                        const attrKey = parseAttribute(attrName);
                        if (attrKey) {
                            const key = attrKey + '_Percent';
                            stats[key] = (stats[key] || 0) + val;
                            return;
                        }
                    }

                    // Check flat
                    const matchFlat = clean.match(/([^\+]+)\+(\d+)/);
                    if (matchFlat) {
                        const attrName = matchFlat[1];
                        const val = parseInt(matchFlat[2], 10);
                        const attrKey = parseAttribute(attrName);
                        if (attrKey && !isNaN(val)) {
                            stats[attrKey] = (stats[attrKey] || 0) + val;
                        }
                    }
                });
            }
        }
    });

    return stats;
};

export const parseTarget = (sentence: string): string | undefined => {
    if (sentence.includes('味方全員') || sentence.includes('すべての味方')) {
        return 'AllAllies';
    } else if (sentence.includes('自身')) {
        return 'Self';
    } else if (sentence.includes('敵') || sentence.includes('ターゲット')) {
        return 'Default';
    }
    return undefined;
};

export const parseDuration = (sentence: string): number | undefined => {
    // Check for permanent first
    if (sentence.includes('永続')) {
        return -1;
    } else {
        const dMatch = sentence.match(/(\d+)ターン(?:持続|の間)/);
        if (dMatch) {
            return parseInt(dMatch[1], 10);
        }
    }
    return undefined;
};

export const determineEffectType = (verb: string): 'Buff' | 'Debuff' => {
    return ['低下', '減少', 'ダウン'].includes(verb) ? 'Debuff' : 'Buff';
};

export const determineCalculationType = (scalingFactor?: string): { calculationType: string, scalingFactor?: string } => {
    if (!scalingFactor) {
        return { calculationType: 'Fixed', scalingFactor: undefined };
    }
    if (scalingFactor.includes('支援力')) {
        return { calculationType: 'SupportScaling', scalingFactor: undefined };
    }
    return { calculationType: 'Fixed', scalingFactor: scalingFactor };
};

export const splitSkillDescription = (description: string): string[] => {
    // Only split by ♦, do NOT split by newlines as they might break sentences mid-word.
    return description.split(/(?=♦)/).map(s => s.trim()).filter(s => s.length > 0);
};

export const parseSkillDescription = (description: string): SkillEffect[] => {
    let effects: SkillEffect[] = [];

    // Stateful Sentence Parsing
    // Split by period or newline using helper
    const chunks = splitSkillDescription(description);

    // Flatten chunks into sentences for processing
    // splitSkillDescription handles high-level grouping (e.g. by '♦'), but for logic we likely need 
    // sentence-level granularity (splitting by '。') to handle sequential effects/durations correctly.
    // Flatten chunks into sentences for processing
    // Replace newlines with space to handle wrap-around words, then split by period.
    const sentences = chunks.flatMap(chunk =>
        chunk.replace(/[\r\n]+/g, ' ').split(/[。]+/).map(s => s.trim()).filter(s => s.length > 0)
    );

    // Buffer to hold effects found in the current "thought unit" until a duration is found
    let pendingEffects: SkillEffect[] = [];
    // Buffer to hold effects that are waiting for a verb (e.g. "A is 10%, B is 20% UP")
    let verbPendingEffects: Partial<SkillEffect>[] = [];
    let lastDuration: number | undefined;
    let lastTarget: string = 'Default'; // Default target for this sentence

    sentences.forEach((sentence) => {
        // Empty check is handled by split/filter above, but safety check doesn't hurt
        if (!sentence) return;

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
        const fixedPattern = /((?:[^\x00-\x7F]|\s)+?)(?:が|を)(\d+)%(?:(増加|上昇|アップ|低下|減少|ダウン)|([、,]))/g;
        const fixedMatches = [...sentence.matchAll(fixedPattern)];
        fixedMatches.forEach(m => {
            const attrRaw = m[1];
            const value = parseInt(m[2], 10);
            const attrKey = parseAttribute(attrRaw);

            if (attrKey) {
                const verb = m[3];

                if (verb) {
                    const type = determineEffectType(verb);
                    const isDecrease = type === 'Debuff';
                    // Resolve any pending verb-less effects
                    flushVerbPending(isDecrease);

                    pendingEffects.push({
                        type,
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

        const genericScalingPattern = /((?:[^\x00-\x7F]|\s)+?)(?:が|を)((?:[^\x00-\x7F]|\s)*?)\s*[x×]\s*(\d+)%?(?:分)?(?:(増加|上昇|アップ|低下|減少|ダウン|獲得)|([、,]))/g;
        const genericScalingMatches = [...sentence.matchAll(genericScalingPattern)];
        genericScalingMatches.forEach(m => {
            const attrRaw = m[1];
            const scalingFactor = m[2];
            const value = parseInt(m[3], 10);
            const attrKey = parseAttribute(attrRaw);

            if (attrKey) {
                const verb = m[4];

                if (verb) {
                    const type = determineEffectType(verb);
                    const isDecrease = type === 'Debuff';
                    // Resolve any pending verb-less effects
                    flushVerbPending(isDecrease);

                    const calcInfo = determineCalculationType(scalingFactor);
                    pendingEffects.push({
                        type,
                        calculationType: calcInfo.calculationType,
                        attribute: attrKey,
                        value: value,
                        scalingFactor: calcInfo.scalingFactor
                    });
                } else {
                    // It's a comma-separated list item, wait for verb
                    const calcInfo = determineCalculationType(scalingFactor);
                    verbPendingEffects.push({
                        calculationType: calcInfo.calculationType,
                        attribute: attrKey,
                        value: value,
                        scalingFactor: calcInfo.scalingFactor
                    });
                }
            }
        });

        // 2. Extract Duration & Target in this sentence
        const duration = parseDuration(sentence);
        const target = parseTarget(sentence);

        // If a specific target is found for this sentence, update lastTarget
        if (target) {
            lastTarget = target;
        }

        // 3. Resolution
        // If we found a duration in this sentence, assign it to ALL pending effects 
        // (including those from previous sentences that haven't been resolved yet).
        if (duration !== undefined) {
            pendingEffects.forEach(e => {
                e.duration = duration;
                if (lastTarget !== 'Default' && !e.target) e.target = lastTarget;
                if (!e.target) e.target = 'Default';
            });
            effects.push(...pendingEffects);
            pendingEffects = [];
            lastDuration = duration;
        } else {
            // Apply target even if duration not found yet
            pendingEffects.forEach(e => {
                if (lastTarget !== 'Default' && !e.target) e.target = lastTarget;
            });
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
        // Final pass to ensure target is set
        pendingEffects.forEach(e => {
            if (!e.target) e.target = lastTarget !== 'Default' ? lastTarget : 'Default';
        });
        effects.push(...pendingEffects);
    }

    return effects;
};

export const processSkillAttributes = (skills: SkillData[]): SkillData[] => {
    return skills.map(skill => {
        let lastEffects: SkillEffect[] = [];
        const levels = skill.levels.sort(() => {
            // Ensure levels are sorted numerically for inheritance (Ex handled separately if needed, treating as -1 or 0?)
            // Normally levels are 1, 2, 3... Ex might be separate.
            // Assuming input is already sorted or we handle the array order.
            // Let's assume array order is correct for now (1 -> 10).
            return 0; // Keep original order
        }).map(levelObj => {
            const { description } = levelObj;
            let effects: SkillEffect[] = [];

            if (description) {
                effects = parseSkillDescription(description);
                lastEffects = effects; // Update last known effects
            } else {
                // Inherit from previous level if description is missing
                // Clone the effects to avoid reference issues
                effects = lastEffects.map(e => ({ ...e }));
            }

            return {
                ...levelObj,
                effects
            };
        });

        return {
            ...skill,
            levels
        };
    });
};

export const parseCharacterData = (html: string): ParsedCharacterData => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    let skills = parseSkills(doc);
    skills = processSkillAttributes(skills); // Post-processing step

    const baseStats = parseStats(doc);
    const { name, type } = parseBasicInfo(doc);

    // Map Type to Role
    let role: string | undefined;
    if (type) {
        if (type.includes('攻撃')) role = 'Attacker';
        else if (type.includes('支援')) role = 'Supporter';
        else if (type.includes('防御')) role = 'Defender';
        else if (type.includes('超越')) role = 'Transcendence';
        else if (type.includes('火力')) role = 'Firepower';
    }

    // Extended Stats Parsing
    const awakeningStats = parseAwakeningStats(doc);
    const equipmentStats = parseEquipmentStats(doc);
    const bondStats = parseBondStats(doc);

    // Clean Base Stats
    const numericStats: { [key: string]: number } = {};
    if (baseStats) {
        // Map baseStats keys to standard keys used in extended parsing
        const formatKey = (k: string) => {
            switch (k) {
                case 'hp': return 'Hp';
                case 'attack': return 'Attack';
                case 'defense': return 'Armor';
                case 'critRate': return 'CritRate';
                case 'critDamage': return 'CritDamage';
                case 'speed': return 'Mobility';
                default: return k; // Should not happen given interface
            }
        };

        Object.entries(baseStats).forEach(([key, val]) => {
            const standardKey = formatKey(key);
            if (typeof val === 'string') {
                const match = val.replace(/,/g, '').match(/(\d+(\.\d+)?)/);
                if (match) {
                    numericStats[standardKey] = parseFloat(match[1]);
                } else {
                    numericStats[standardKey] = 0;
                }
            } else {
                numericStats[standardKey] = val;
            }
        });
    }

    // Fix: If role is Supporter, 'Attack' in base stats is actually 'Support'.
    // The parser assigns column 5 to 'attack'.
    if (role === 'Supporter' && numericStats['Attack'] !== undefined) {
        numericStats['Support'] = numericStats['Attack'];
        delete numericStats['Attack'];
    }

    // Aggregation Logic
    // 1. Add Flat Stats (Awakening, Bond Flat) to Base
    // 2. Add Percentage Stats (Equipment, Bond %) converted to flat values based on the NEW Base (Base + Flat Buffs)
    //    Assumption: Modifiers generally apply to the character's "Sheet Stats" which includes permanent flat increases like Awakening/Bond.

    // Step 1: Add Flat Increases
    Object.entries(awakeningStats).forEach(([key, val]) => {
        numericStats[key] = (numericStats[key] || 0) + val;
    });

    // Handle Bond Flat Stats (those without _Percent suffix)
    Object.entries(bondStats).forEach(([key, val]) => {
        if (!key.endsWith('_Percent')) {
            numericStats[key] = (numericStats[key] || 0) + val;
        }
    });

    // Step 2: Add Percentage Increases (Equipment, Bond %)
    // We assume these apply to the result of Step 1.
    // Equipment Stats are Percentage (based on parsing logic assumption "Support 10%").
    // Bond Stats with _Percent suffix are Percentage.



    // Rounding: Stats are typically integers?
    // Let's round to nearest integer to avoid 3534.4000000001
    // Except Crit Rate/Dmg which are %... but here they are stored as numbers (e.g. 20 means 20%).
    // If we just add % to %, it's fine.
    // If we scale % by % (e.g. CritRate + 10% * CritRate?), usually CritRate modifiers are additive (Flat %).
    // Wait, Equipment text: "Support 10%". That's clearly multiplier.
    // Bond text: "Mobility +5%". That's likely multiplier if Mobility is a value, or additive if Mobility is %.
    // In this game, Mobility is usually 0 initially for many chars but Monika has 0%.
    // If it's 0, +5% mult is 0. +5% flat is 5.
    // Code above treats "Mobility_Percent" as `applyPercentage` -> Multiply.
    // If Base is 0, result is 0.
    // If "Mobility+5%" means "Add 5 to Mobility" (assuming Mobility is measured in %), then it should be flat.
    // But `parseBondStats` separates valid % keys.
    // Usually for `Rate` stats (CritRate, CritDamage), +10% means +10 flat value (since value is %).
    // For `Power` stats (Attack, Support, HP, Armor), +10% means Multiplying base value.

    // Refinement:
    // If key is CritRate, CritDamage, Evasion, etc., usually modifiers act differently?
    // Or does "Support 10%" mean +10 flat support? No, likely percent.
    // "CritRate 10%" -> +10 flat.

    // Let's refine `applyPercentage`:
    // Keys that are definitely 'Rate' types: CritRate, CritDamage, Evasion...?
    // Actually, `ATTRIBUTE_MAP` maps `会心率` to `CritRate`.
    // If Base CritRate is 0, and Equipment gives "CritRate 10%", is it 0*1.1=0 or 0+10=10?
    // It is almost certainly +10 (Add 10 to the percentage value).
    // So for Rate stats, we should Treat "Percent" sources as FLAT additions if they represent the stat unit.

    // Check keys.
    const rateKeys = ['CritRate', 'CritDamage', 'Evasion', 'DamageReduction', 'DamageBoost', 'EffectHitRate', 'EffectResist', 'Support', 'Mobility', 'Armor'];

    const applyModifier = (key: string, val: number) => {
        // If isPercentSource is true (coming from "10%"), 
        // AND the stat itself is a Rate (e.g. CritRate), then it is an Additive increase to the rate (Flat addition in our number representation).
        // e.g. Base 0(%) + Equipment 10(%) = 10(%).
        // IF the stat is a Value (HP, Attack), then it is a Multiplier.
        // e.g. Base 1000 + Equipment 10(%) = 1100.

        if (rateKeys.includes(key)) {
            // It's a rate. val is already "10" (representing 10%).
            // Just add it.
            numericStats[key] = (numericStats[key] || 0) + val;
        } else {
            // It's a value (HP, Support).
            // Multiplier.
            if (numericStats[key] !== undefined) {
                const increase = numericStats[key] * (val / 100);
                numericStats[key] += increase;
            }
        }
    };

    Object.entries(equipmentStats).forEach(([key, val]) => {
        applyModifier(key, val);
    });

    Object.entries(bondStats).forEach(([key, val]) => {
        if (key.endsWith('_Percent')) {
            const actualKey = key.replace('_Percent', '');
            applyModifier(actualKey, val);
        }
    });

    // Finally round only Value stats, keep Rate stats (maybe?)
    // Usually UI wants integers for HP/Atk.
    Object.keys(numericStats).forEach(key => {
        if (!rateKeys.includes(key)) {
            numericStats[key] = Math.round(numericStats[key]);
        }
    });



    return { skills, stats: numericStats, name, type, role };
};
