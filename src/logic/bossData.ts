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
        // Remove all effects (Buff/Debuff) from Support Skills (Source is Supporter)
        // unless they are Undispellable.
        context.accumulatedSkills.forEach((skills, pIdx) => {
            const filtered = skills.map(skill => {
                // Find source character
                const sourceChar = context.party.find(p => p?.name === skill.source);
                const isSupporter = sourceChar?.role === 'Supporter' || sourceChar?.type?.includes('支援');

                if (isSupporter) {
                    // Filter effects: Keep if Undispellable
                    const newEffects = skill.effects.filter(e => e.isUndispellable);

                    if (newEffects.length === 0) return null;
                    return { ...skill, effects: newEffects };
                }

                // If not a supporter skill, keep as is
                return skill;
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
