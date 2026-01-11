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
        // Remove all effects (Buff/Debuff) from ALL Skills unless they are Undispellable.
        context.accumulatedSkills.forEach((skills, pIdx) => {
            const filtered = skills.map(skill => {
                // Filter effects: Keep only if Undispellable
                const newEffects = skill.effects.filter(e => e.isUndispellable);

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
