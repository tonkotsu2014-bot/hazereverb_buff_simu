import fs from 'fs';
import path from 'path';

function loadHtml(filename: string): string {
    return fs.readFileSync(path.join(__dirname, 'data', filename), 'utf-8');
}

export const TEST_HTML = loadHtml('mock_character.html');
export const IRIA_HTML = loadHtml('iria.html');
export const DOROCY_HTML = loadHtml('dorocy.html');
export const MONIKA_HTML = loadHtml('monika.html');
