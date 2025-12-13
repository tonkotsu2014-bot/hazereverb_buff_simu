
export interface SkillData {
    name: string;
    levels: { level: string; description: string | null }[];
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

const parseSkills = (doc: Document): SkillData[] => {
    const wikiBody = doc.getElementById('wikibody');
    if (!wikiBody) return [];

    const skills: SkillData[] = [];
    const tables = wikiBody.querySelectorAll('table');

    tables.forEach(table => {
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');

        if (thead && tbody) {
            const headers = Array.from(thead.querySelectorAll('th'));
            const skillNameHeader = headers.find(th => th.textContent?.includes('スキル'));

            if (skillNameHeader) {
                let skillName = skillNameHeader.textContent?.trim() || 'Unknown Skill';
                skillName = skillName.replace(/<!--.*?-->/g, '').trim();

                const levels: { level: string; description: string | null }[] = [];
                const rows = tbody.querySelectorAll('tr');

                rows.forEach(row => {
                    const cells = row.querySelectorAll('td');
                    if (cells.length === 1) {
                        const content = cells[0].textContent?.trim() || '';
                        // If content is just digits, treat it as a level
                        if (/^\d+$/.test(content)) {
                            levels.push({ level: content, description: null });
                        } else if (content) {
                            // Fallback for "legacy" description parsing or Ex skill special cases
                            // Only add if it looks like a description (not a number)
                            const levelObj = { level: skillName.includes('Ex') ? 'Ex' : '1', description: content };
                            levels.push(levelObj);
                        }
                    } else if (cells.length >= 2) {
                        const level = cells[0].textContent?.trim() || '';
                        const description = cells[1].textContent?.trim() || '';
                        if (level && description) {
                            levels.push({ level, description });
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

export const parseCharacterData = (html: string): ParsedCharacterData => {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, 'text/html');

    const skills = parseSkills(doc);
    const stats = parseStats(doc);
    const { name, type } = parseBasicInfo(doc);

    return { skills, stats, name, type };
};
