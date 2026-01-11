import type { SimulationCharacter, ReceivedSkill } from './turnSimulator';

export interface BossCharacter extends SimulationCharacter {
    description: string;
}

export const ICARUS: BossCharacter = {
    name: 'イカロス',
    description: '行動時にすべてのバフを解除',
    role: 'Boss',
    type: 'Boss',
    stats: {
        HP: 100000, // Placeholder
        Attack: 1000, // Placeholder
        Defense: 100, // Placeholder
        Speed: 100, // Placeholder
        Crit: 0,
        CritDmg: 0,
        Accuracy: 0,
        Evasion: 0,
        DebuffAccuracy: 0,
        DebuffResist: 0,
        Support: 0
    },
    skills: [], // No data-driven skills
    onAction: (context) => {
        // Clear Buffs Logic
        // Remove all buffs from all party members (Enemies of the Boss)
        context.accumulatedSkills.forEach((skills, pIdx) => {
            const filtered = skills.map(skill => {
                const newEffects = skill.effects.filter(e => e.type !== 'Buff');

                // If a skill has no effects left (and wasn't just empty to begin with? No, remove if empty?)
                // If a ReceivedSkill loses all effects, it essentially does nothing. Keep it or remove it?
                // Logic in turnSimulator usually filters out skills with no active effects for snapshot, 
                // but here we modify the state directly.
                // Let's filter out the skill entirely if no effects remain, to be clean.
                if (newEffects.length === 0) return null;

                return { ...skill, effects: newEffects };
            }).filter(s => s !== null) as ReceivedSkill[];

            // Mutate the array in place
            context.accumulatedSkills[pIdx] = filtered;
        });

        // Log specific action if needed? 
        // Currently turnSimulator logs "Boss" action generically. 
        // If we want to verify distinct skills, we might need a way to push sub-actions or logs.
        // For now, implicit effect (clearing buffs) is the visible outcome.
    }
};

export const DEFAULT_BOSS: BossCharacter = {
    name: 'Boss',
    description: 'デフォルトのボス',
    role: 'Boss',
    type: 'Boss',
    stats: {
        HP: 100000,
        Attack: 1000,
        Defense: 100,
        Speed: 100,
        Crit: 0,
        CritDmg: 0,
        Accuracy: 0,
        Evasion: 0,
        DebuffAccuracy: 0,
        DebuffResist: 0,
        Support: 0
    },
    skills: [],
    onAction: () => { /* Default boss does nothing */ }
};
