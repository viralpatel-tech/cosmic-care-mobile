
export type KnowledgeEntry = {
    id: string;
    branch: string;
    question: string;
    answer: string;
    limitation: string;
    sourceTitle: string;
    sourceUrl: string;
    related: string[];
};

export const knowledge: KnowledgeEntry[] = [
    {
        id: 'bone',
        branch: 'Bone Health',
        question: 'Why do astronauts lose bone density?',
        answer:
            'In microgravity, weight-bearing bones experience less mechanical loading. NASA reports that bone density can decline during spaceflight, especially in areas such as the hips and spine. Resistance exercise is an important countermeasure.',
        limitation:
            'The amount of bone loss varies. Long-term effects and the effectiveness of countermeasures remain active research topics.',
        sourceTitle: 'NASA — Risk of Spaceflight-Induced Bone Changes',
        sourceUrl:
            'https://www.nasa.gov/reference/risk-of-spaceflight-induced-bone-changes/',
        related: ['gravity', 'exercise'],
    },
    {
        id: 'exercise',
        branch: 'Bone Health',
        question: 'Why do astronauts need exercise?',
        answer:
            'Reduced loading during spaceflight can affect muscles, bones, and physical fitness. NASA uses exercise as an important countermeasure to help limit deconditioning during missions.',
        limitation:
            'Exercise plans are mission-specific. This entry does not provide an individual exercise prescription.',
        sourceTitle: 'NASA — Human Spaceflight Health Risks',
        sourceUrl: 'https://www.nasa.gov/hrp/risks/',
        related: ['bone', 'gravity'],
    },
    {
        id: 'sleep',
        branch: 'Sleep & Fatigue',
        question: 'Why is astronaut sleep disrupted?',
        answer:
            'Astronauts can experience irregular light-dark cycles, demanding schedules, and sleep disruption. These stressors can affect health and performance. NASA investigates lighting and scheduling strategies to support crew sleep.',
        limitation:
            'Not every astronaut experiences the same sleep problems. The effects depend on individual and mission factors.',
        sourceTitle: 'NASA — Risk from Inadequate Sleep and Irregular Schedules',
        sourceUrl:
            'https://www.nasa.gov/reference/risk-from-inadequate-sleep-and-irregular-schedules/',
        related: ['isolation', 'environment'],
    },
    {
        id: 'radiation',
        branch: 'Radiation',
        question: 'Why is space radiation a health risk?',
        answer:
            'Space radiation is one of NASA’s five major hazards of human spaceflight. Exposure to ionizing radiation can increase long-term health risks, including cancer risk. Radiation protection is an important consideration for deep-space missions.',
        limitation:
            'Individual risk depends on radiation exposure, mission conditions, and other factors. This entry cannot estimate a person’s risk.',
        sourceTitle: 'NASA — Risks of Human Spaceflight',
        sourceUrl: 'https://www.nasa.gov/hrp/risks/',
        related: ['mars', 'environment'],
    },
    {
        id: 'heart',
        branch: 'Cardiovascular',
        question: 'How does spaceflight affect cardiovascular health?',
        answer:
            'Altered gravity changes how the body experiences fluid distribution and physical loading. NASA identifies cardiovascular adaptation and reduced cardiorespiratory fitness as important human spaceflight research concerns.',
        limitation:
            'This is a general description of research risks. It cannot interpret an astronaut’s actual heart-rate or blood-pressure readings.',
        sourceTitle: 'NASA — Human Research Roadmap Risks',
        sourceUrl: 'https://humanresearchroadmap.nasa.gov/risks/',
        related: ['gravity', 'exercise'],
    },
    {
        id: 'gravity',
        branch: 'Microgravity',
        question: 'How does microgravity affect the human body?',
        answer:
            'In microgravity, the body adapts to reduced gravitational loading. Bones, muscles, balance systems, and cardiovascular function can be affected. Returning to a gravitational environment requires readaptation.',
        limitation:
            'Effects vary by mission duration, individual characteristics, and countermeasures.',
        sourceTitle: 'NASA — Five Hazards of Human Spaceflight',
        sourceUrl: 'https://www.nasa.gov/hrp/hazards/',
        related: ['bone', 'heart'],
    },
    {
        id: 'isolation',
        branch: 'Behavioral Health',
        question: 'How does isolation affect astronaut well-being?',
        answer:
            'Isolation and confinement are major human spaceflight hazards. Long missions require attention to crew communication, teamwork, behavioral health, and performance.',
        limitation:
            'This entry describes general mission concerns and does not assess anyone’s psychological condition.',
        sourceTitle: 'NASA — Five Hazards of Human Spaceflight',
        sourceUrl: 'https://www.nasa.gov/hrp/hazards/',
        related: ['sleep', 'mars'],
    },
    {
        id: 'nutrition',
        branch: 'Nutrition',
        question: 'Why is nutrition important during spaceflight?',
        answer:
            'NASA identifies inadequate food and nutrition as a human spaceflight health risk. Nutritious, safe, and sufficiently long-lasting food is important for supporting astronaut health and performance.',
        limitation:
            'This entry does not specify individual dietary requirements or nutritional treatment.',
        sourceTitle: 'NASA — Risks of Human Spaceflight',
        sourceUrl: 'https://www.nasa.gov/hrp/risks/',
        related: ['bone', 'exercise'],
    },
    {
        id: 'mars',
        branch: 'Mission Safety',
        question: 'Why are medical emergencies challenging on Mars missions?',
        answer:
            'Distance from Earth is one of NASA’s major human spaceflight hazards. Deep-space crews face communication delays, limited resupply, and reduced access to medical support from Earth, increasing the need for onboard capabilities.',
        limitation:
            'Specific medical capabilities depend on mission design. This entry does not provide emergency treatment instructions.',
        sourceTitle: 'NASA — Five Hazards of Human Spaceflight',
        sourceUrl: 'https://www.nasa.gov/hrp/hazards/',
        related: ['radiation', 'environment'],
    },
    {
        id: 'environment',
        branch: 'Mission Safety',
        question: 'Why does spacecraft air and environment matter?',
        answer:
            'NASA identifies hostile or closed environments as a major spaceflight hazard. Spacecraft habitability depends on factors including temperature, pressure, lighting, noise, and microbial conditions.',
        limitation:
            'This is a general overview and does not establish safe operating thresholds for a particular spacecraft.',
        sourceTitle: 'NASA — Five Hazards of Human Spaceflight',
        sourceUrl: 'https://www.nasa.gov/hrp/hazards/',
        related: ['mars', 'sleep'],
    },
];

export const branches = [
    'All',
    ...Array.from(new Set(knowledge.map(item => item.branch))),
];

export function findEntry(id: string) {
    return knowledge.find(item => item.id === id);
}

export function searchKnowledge(query: string): KnowledgeEntry[] {
    const words = query
        .toLowerCase()
        .match(/[a-z0-9]+/g) ?? [];

    const ignored = new Set([
        'a', 'an', 'the', 'is', 'are', 'do', 'does',
        'how', 'why', 'what', 'can', 'in', 'on',
        'to', 'of', 'for', 'and', 'astronauts',
        'astronaut', 'space', 'spaceflight',
    ]);

    const meaningful = words.filter(
        word => word.length > 2 && !ignored.has(word)
    );

    if (!meaningful.length) return [];

    return knowledge
        .map(item => {
            const title = item.question.toLowerCase();
            const category = item.branch.toLowerCase();

            const score = meaningful.reduce((total, word) => {
                if (title.includes(word)) return total + 3;
                if (category.includes(word)) return total + 2;
                return total;
            }, 0);

            return { item, score };
        })
        .filter(result => result.score >= 3)
        .sort((a, b) => b.score - a.score)
        .map(result => result.item);
}
