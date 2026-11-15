
import React, {
    createContext,
    useCallback,
    useContext,
    useEffect,
    useMemo,
    useRef,
    useState,
} from 'react';

import {
    appendTelemetryReading,
    loadTelemetryHistory,
    clearTelemetryHistory,
    type StoredTelemetryReading,
    type TelemetrySnapshot,
} from '../storage/telemetryStorage';

import {
    assessHealth,
    assessCrewHealth,
    type HealthAssessment,
    type AlertSeverity,
} from '../services/healthAlertEngine';

export type MetricKey =
    | 'heart'
    | 'oxygen'
    | 'temperature'
    | 'sleep'
    | 'respiration';

export type Telemetry = Record<MetricKey, number[]>;

export type CrewReadings = {
    heart: number;
    oxygen: number;
    temperature: number;
    sleep: number;
    respiratory: number;
};

export type CrewHealthAssessment =
    HealthAssessment & {
    crewId: string;
};

type CrewId =
    | 'CM-01'
    | 'CM-02'
    | 'CM-03'
    | 'CM-04';

type CrewReadingMap = Record<CrewId, CrewReadings>;

type MissionHealthContextValue = {
    telemetry: Telemetry;
    displayed: Record<MetricKey, number>;
    tick: number;
    selectedId: string;
    setSelectedId: (id: string) => void;
    alertId: string | null;
    alertDemo: boolean;
    triggerAlert: (id?: string) => void;
    clearAlert: () => void;
    reset: () => void;
    addSample: () => void;
    crewReadings: (id: string) => CrewReadings;
    history: StoredTelemetryReading[];
    historyLoaded: boolean;
    refreshHistory: () => Promise<void>;
    clearHistory: () => Promise<void>;
    healthAssessment: HealthAssessment;
    selectedCrewAssessment: HealthAssessment;
    assessCrew: (id: string) => CrewHealthAssessment;
    activeAlertCount: number;
    highestSeverity: AlertSeverity;
};

const CREW_IDS: CrewId[] = [
    'CM-01',
    'CM-02',
    'CM-03',
    'CM-04',
];

const SAMPLE_INTERVAL_MS = 4500;
const MAX_CHART_SAMPLES = 30;
const MAX_LOCAL_HISTORY = 1000;

const BASE_READINGS: CrewReadingMap = {
    'CM-01': {
        heart: 73,
        oxygen: 99,
        temperature: 36.7,
        sleep: 7.6,
        respiratory: 16,
    },
    'CM-02': {
        heart: 76,
        oxygen: 98,
        temperature: 36.6,
        sleep: 7.2,
        respiratory: 17,
    },
    'CM-03': {
        heart: 70,
        oxygen: 99,
        temperature: 36.8,
        sleep: 8.0,
        respiratory: 15,
    },
    'CM-04': {
        heart: 78,
        oxygen: 98,
        temperature: 36.5,
        sleep: 7.4,
        respiratory: 16,
    },
};

const INITIAL_TELEMETRY: Telemetry = {
    heart: [
        71, 72, 73, 72, 74,
        73, 72, 74, 75, 73,
        72, 74, 73, 72, 73,
    ],
    oxygen: [
        99, 99, 98, 99, 99,
        98, 99, 99, 98, 99,
        99, 99, 98, 99, 99,
    ],
    temperature: [
        36.6, 36.7, 36.7, 36.6, 36.8,
        36.7, 36.6, 36.7, 36.8, 36.7,
        36.7, 36.6, 36.7, 36.8, 36.7,
    ],
    sleep: [
        7.5, 7.6, 7.4, 7.7, 7.6,
        7.5, 7.8, 7.6, 7.5, 7.6,
        7.7, 7.5, 7.6, 7.6, 7.6,
    ],
    respiration: [
        16, 16, 17, 16, 15,
        16, 16, 17, 16, 16,
        15, 16, 17, 16, 16,
    ],
};

const INITIAL_DISPLAYED: Record<MetricKey, number> = {
    heart: 73,
    oxygen: 99,
    temperature: 36.7,
    sleep: 7.6,
    respiration: 16,
};

const MissionHealthContext =
    createContext<MissionHealthContextValue | null>(null);

function clamp(
    value: number,
    minimum: number,
    maximum: number
): number {
    return Math.max(
        minimum,
        Math.min(maximum, value)
    );
}

function round(
    value: number,
    digits: number
): number {
    const factor = Math.pow(10, digits);

    return Math.round(value * factor) / factor;
}

function copyReadings(
    readings: CrewReadings
): CrewReadings {
    return { ...readings };
}

function createInitialCrewReadings(): CrewReadingMap {
    return {
        'CM-01': copyReadings(BASE_READINGS['CM-01']),
        'CM-02': copyReadings(BASE_READINGS['CM-02']),
        'CM-03': copyReadings(BASE_READINGS['CM-03']),
        'CM-04': copyReadings(BASE_READINGS['CM-04']),
    };
}

function normalizeCrewId(id: string): CrewId {
    return CREW_IDS.includes(id as CrewId)
        ? (id as CrewId)
        : 'CM-01';
}

function toHealthReadings(readings: CrewReadings) {
    return {
        heart: readings.heart,
        oxygen: readings.oxygen,
        temperature: readings.temperature,
        sleep: readings.sleep,
        respiration: readings.respiratory,
    };
}

function toDisplayed(
    readings: CrewReadings
): Record<MetricKey, number> {
    return {
        heart: readings.heart,
        oxygen: readings.oxygen,
        temperature: readings.temperature,
        sleep: readings.sleep,
        respiration: readings.respiratory,
    };
}

function toTelemetrySnapshot(
    crewId: CrewId,
    readings: CrewReadings,
    demoAlert: boolean
): TelemetrySnapshot {
    return {
        crewId,
        heart: readings.heart,
        oxygen: readings.oxygen,
        temperature: readings.temperature,
        sleep: readings.sleep,
        respiration: readings.respiratory,
        demoAlert,
    };
}

function fromStoredReading(
    record: StoredTelemetryReading
): CrewReadings {
    return {
        heart: record.heart,
        oxygen: record.oxygen,
        temperature: record.temperature,
        sleep: record.sleep,
        respiratory: record.respiration,
    };
}

function isValidRecord(
    record: StoredTelemetryReading
): boolean {
    return (
        CREW_IDS.includes(record.crewId as CrewId) &&
        Number.isFinite(Date.parse(record.timestamp)) &&
        Number.isFinite(record.heart) &&
        Number.isFinite(record.oxygen) &&
        Number.isFinite(record.temperature) &&
        Number.isFinite(record.sleep) &&
        Number.isFinite(record.respiration)
    );
}

function normalizeHistory(
    records: StoredTelemetryReading[]
): StoredTelemetryReading[] {
    return records
        .filter(isValidRecord)
        .sort(
            (a, b) =>
                Date.parse(a.timestamp) -
                Date.parse(b.timestamp)
        )
        .slice(-MAX_LOCAL_HISTORY);
}

function generateCrewReading(
    crewId: CrewId,
    step: number,
    demoAlert: boolean
): CrewReadings {
    const base = BASE_READINGS[crewId];
    const crewIndex = CREW_IDS.indexOf(crewId);
    const phase = crewIndex * 1.47;

    const slowWave = Math.sin(step * 0.23 + phase);
    const fastWave = Math.sin(step * 0.71 + phase * 1.3);
    const oxygenWave = Math.cos(step * 0.31 + phase);
    const temperatureWave = Math.sin(step * 0.13 + phase);
    const sleepWave = Math.sin(step * 0.055 + phase);

    let readings: CrewReadings = {
        heart: Math.round(
            clamp(
                base.heart +
                slowWave * 3.5 +
                fastWave * 1.7,
                45,
                115
            )
        ),
        oxygen: Math.round(
            clamp(
                base.oxygen + oxygenWave * 0.7,
                94,
                100
            )
        ),
        temperature: round(
            clamp(
                base.temperature +
                temperatureWave * 0.13 +
                fastWave * 0.025,
                35.5,
                38
            ),
            1
        ),
        sleep: round(
            clamp(
                base.sleep + sleepWave * 0.45,
                5.5,
                9
            ),
            1
        ),
        respiratory: Math.round(
            clamp(
                base.respiratory +
                slowWave * 1.5 +
                fastWave * 0.6,
                10,
                23
            )
        ),
    };

    if (demoAlert) {
        readings = {
            ...readings,
            heart: Math.round(
                clamp(
                    123 + Math.sin(step * 0.35 + phase) * 5,
                    118,
                    130
                )
            ),
            oxygen: Math.round(
                clamp(
                    89 + Math.sin(step * 0.21 + phase) * 2,
                    87,
                    91
                )
            ),
            respiratory: Math.round(
                clamp(
                    29 + Math.sin(step * 0.4 + phase) * 2,
                    27,
                    31
                )
            ),
        };
    }

    return readings;
}

function appendMetric(
    values: number[],
    nextValue: number
): number[] {
    return [
        ...values.slice(-(MAX_CHART_SAMPLES - 1)),
        nextValue,
    ];
}

function appendTelemetry(
    telemetry: Telemetry,
    readings: CrewReadings
): Telemetry {
    return {
        heart: appendMetric(
            telemetry.heart,
            readings.heart
        ),
        oxygen: appendMetric(
            telemetry.oxygen,
            readings.oxygen
        ),
        temperature: appendMetric(
            telemetry.temperature,
            readings.temperature
        ),
        sleep: appendMetric(
            telemetry.sleep,
            readings.sleep
        ),
        respiration: appendMetric(
            telemetry.respiration,
            readings.respiratory
        ),
    };
}

function getHighestSeverity(
    assessments: HealthAssessment[]
): AlertSeverity {
    const severityOrder: AlertSeverity[] = [
        'normal',
        'advisory',
        'warning',
        'critical',
    ];

    return assessments.reduce<AlertSeverity>(
        (highest, assessment) =>
            severityOrder.indexOf(assessment.severity) >
            severityOrder.indexOf(highest)
                ? assessment.severity
                : highest,
        'normal'
    );
}

export function MissionHealthProvider({
                                          children,
                                      }: {
    children: React.ReactNode;
}) {
    const [telemetry, setTelemetry] =
        useState<Telemetry>(() => ({
            heart: [...INITIAL_TELEMETRY.heart],
            oxygen: [...INITIAL_TELEMETRY.oxygen],
            temperature: [...INITIAL_TELEMETRY.temperature],
            sleep: [...INITIAL_TELEMETRY.sleep],
            respiration: [...INITIAL_TELEMETRY.respiration],
        }));

    const [displayed, setDisplayed] =
        useState<Record<MetricKey, number>>({
            ...INITIAL_DISPLAYED,
        });

    const [tick, setTick] = useState(0);

    const [selectedIdState, setSelectedIdState] =
        useState<string>('CM-01');

    const [alertId, setAlertId] =
        useState<string | null>(null);

    const [history, setHistory] =
        useState<StoredTelemetryReading[]>([]);

    const [historyLoaded, setHistoryLoaded] =
        useState(false);

    const [crewData, setCrewData] =
        useState<CrewReadingMap>(
            createInitialCrewReadings
        );

    const tickRef = useRef(0);
    const selectedIdRef = useRef<CrewId>('CM-01');
    const alertIdRef = useRef<CrewId | null>(null);

    const crewDataRef = useRef<CrewReadingMap>(
        createInitialCrewReadings()
    );

    const historyRef =
        useRef<StoredTelemetryReading[]>([]);

    const storageQueueRef =
        useRef<Promise<void>>(Promise.resolve());

    const generationRef = useRef(0);
    const mountedRef = useRef(true);
    const loadedRef = useRef(false);

    const setSelectedId = useCallback(
        (id: string) => {
            const normalized = normalizeCrewId(id);

            selectedIdRef.current = normalized;
            setSelectedIdState(normalized);
        },
        []
    );

    const refreshHistory = useCallback(
        async (): Promise<void> => {
            const generation = generationRef.current;

            await storageQueueRef.current.catch(() => {});

            const records = normalizeHistory(
                await loadTelemetryHistory()
            );

            if (
                !mountedRef.current ||
                generation !== generationRef.current
            ) {
                return;
            }

            historyRef.current = records;
            setHistory(records);
            setHistoryLoaded(true);
            loadedRef.current = true;
        },
        []
    );

    const clearHistory = useCallback(
        async (): Promise<void> => {
            generationRef.current += 1;
            const generation = generationRef.current;

            loadedRef.current = false;
            historyRef.current = [];
            setHistory([]);
            setHistoryLoaded(false);

            const operation = storageQueueRef.current
                .catch(() => {})
                .then(async () => {
                    await clearTelemetryHistory();
                });

            storageQueueRef.current =
                operation.catch(() => {});

            try {
                await operation;
            } finally {
                if (
                    mountedRef.current &&
                    generation === generationRef.current
                ) {
                    loadedRef.current = true;
                    setHistoryLoaded(true);
                }
            }
        },
        []
    );

    const addSample = useCallback(() => {
        if (!loadedRef.current) {
            return;
        }

        tickRef.current += 1;

        const nextTick = tickRef.current;
        const activeAlertId = alertIdRef.current;

        const nextCrewData =
            {} as CrewReadingMap;

        const snapshots: TelemetrySnapshot[] = [];

        for (const crewId of CREW_IDS) {
            const demoAlert = activeAlertId === crewId;

            const readings = generateCrewReading(
                crewId,
                nextTick,
                demoAlert
            );

            nextCrewData[crewId] = readings;

            snapshots.push(
                toTelemetrySnapshot(
                    crewId,
                    readings,
                    demoAlert
                )
            );
        }

        crewDataRef.current = nextCrewData;
        setCrewData(nextCrewData);
        setTick(nextTick);

        const selectedReadings =
            nextCrewData[selectedIdRef.current];

        setDisplayed(
            toDisplayed(selectedReadings)
        );

        setTelemetry(previous =>
            appendTelemetry(
                previous,
                selectedReadings
            )
        );

        const generation = generationRef.current;

        const operation = storageQueueRef.current
            .catch(() => {})
            .then(async () => {
                if (
                    !mountedRef.current ||
                    generation !== generationRef.current
                ) {
                    return;
                }

                for (const snapshot of snapshots) {
                    if (
                        !mountedRef.current ||
                        generation !== generationRef.current
                    ) {
                        return;
                    }

                    const saved =
                        await appendTelemetryReading(snapshot);

                    if (
                        !mountedRef.current ||
                        generation !== generationRef.current
                    ) {
                        return;
                    }

                    historyRef.current = [
                        ...historyRef.current,
                        saved,
                    ].slice(-MAX_LOCAL_HISTORY);
                }

                if (
                    mountedRef.current &&
                    generation === generationRef.current
                ) {
                    setHistory([...historyRef.current]);
                }
            });

        storageQueueRef.current =
            operation.catch(() => {});
    }, []);

    const triggerAlert = useCallback(
        (id?: string) => {
            const target = normalizeCrewId(
                id ?? selectedIdRef.current
            );

            alertIdRef.current = target;
            setAlertId(target);

            const nextCrewData: CrewReadingMap = {
                ...crewDataRef.current,
                [target]: generateCrewReading(
                    target,
                    tickRef.current,
                    true
                ),
            };

            crewDataRef.current = nextCrewData;
            setCrewData(nextCrewData);

            if (selectedIdRef.current === target) {
                setDisplayed(
                    toDisplayed(nextCrewData[target])
                );
            }
        },
        []
    );

    const clearAlert = useCallback(() => {
        const previousAlertId =
            alertIdRef.current;

        alertIdRef.current = null;
        setAlertId(null);

        if (previousAlertId) {
            const nextCrewData: CrewReadingMap = {
                ...crewDataRef.current,
                [previousAlertId]: generateCrewReading(
                    previousAlertId,
                    tickRef.current,
                    false
                ),
            };

            crewDataRef.current = nextCrewData;
            setCrewData(nextCrewData);

            if (
                selectedIdRef.current === previousAlertId
            ) {
                setDisplayed(
                    toDisplayed(
                        nextCrewData[previousAlertId]
                    )
                );
            }
        }
    }, []);

    const reset = useCallback(() => {
        tickRef.current = 0;
        setTick(0);

        alertIdRef.current = null;
        setAlertId(null);

        const initialCrew =
            createInitialCrewReadings();

        crewDataRef.current = initialCrew;
        setCrewData(initialCrew);

        const selectedReadings =
            initialCrew[selectedIdRef.current];

        setDisplayed(
            toDisplayed(selectedReadings)
        );

        setTelemetry({
            heart: [...INITIAL_TELEMETRY.heart],
            oxygen: [...INITIAL_TELEMETRY.oxygen],
            temperature: [...INITIAL_TELEMETRY.temperature],
            sleep: [...INITIAL_TELEMETRY.sleep],
            respiration: [...INITIAL_TELEMETRY.respiration],
        });
    }, []);

    const crewReadings = useCallback(
        (id: string): CrewReadings => {
            const normalized = normalizeCrewId(id);

            return {
                ...crewData[normalized],
            };
        },
        [crewData]
    );

    const assessCrew = useCallback(
        (id: string): CrewHealthAssessment => {
            const normalized = normalizeCrewId(id);

            const readings = crewData[normalized];

            return assessCrewHealth(
                normalized,
                toHealthReadings(readings)
            );
        },
        [crewData]
    );

    const selectedCrewAssessment = useMemo(
        () =>
            assessHealth(
                toHealthReadings(
                    crewData[
                        normalizeCrewId(selectedIdState)
                        ]
                )
            ),
        [crewData, selectedIdState]
    );

    const healthAssessment = useMemo(
        () =>
            assessHealth({
                heart: displayed.heart,
                oxygen: displayed.oxygen,
                temperature: displayed.temperature,
                sleep: displayed.sleep,
                respiration: displayed.respiration,
            }),
        [displayed]
    );

    const crewAssessments = useMemo(
        () =>
            CREW_IDS.map(crewId =>
                assessCrewHealth(
                    crewId,
                    toHealthReadings(
                        crewData[crewId]
                    )
                )
            ),
        [crewData]
    );

    const activeAlertCount = useMemo(
        () =>
            crewAssessments.reduce(
                (count, assessment) =>
                    count + assessment.alerts.length,
                0
            ),
        [crewAssessments]
    );

    const highestSeverity = useMemo(
        () =>
            getHighestSeverity(
                crewAssessments
            ),
        [crewAssessments]
    );

    const alertDemo = alertId !== null;

    useEffect(() => {
        selectedIdRef.current =
            normalizeCrewId(selectedIdState);

        const readings =
            crewDataRef.current[
                selectedIdRef.current
                ];

        setDisplayed(
            toDisplayed(readings)
        );

        setTelemetry(previous => {
            const selectedHistory =
                historyRef.current
                    .filter(
                        record =>
                            record.crewId ===
                            selectedIdRef.current
                    )
                    .slice(-MAX_CHART_SAMPLES);

            if (selectedHistory.length === 0) {
                return {
                    heart: [readings.heart],
                    oxygen: [readings.oxygen],
                    temperature: [readings.temperature],
                    sleep: [readings.sleep],
                    respiration: [readings.respiratory],
                };
            }

            return {
                heart: selectedHistory.map(
                    record => record.heart
                ),
                oxygen: selectedHistory.map(
                    record => record.oxygen
                ),
                temperature: selectedHistory.map(
                    record => record.temperature
                ),
                sleep: selectedHistory.map(
                    record => record.sleep
                ),
                respiration: selectedHistory.map(
                    record => record.respiration
                ),
            };
        });
    }, [selectedIdState]);

    useEffect(() => {
        mountedRef.current = true;

        let cancelled = false;

        const initialize = async () => {
            try {
                const records = normalizeHistory(
                    await loadTelemetryHistory()
                );

                if (cancelled || !mountedRef.current) {
                    return;
                }

                historyRef.current = records;
                setHistory(records);

                const latestCrewData =
                    createInitialCrewReadings();

                for (const crewId of CREW_IDS) {
                    const latest = [...records]
                        .reverse()
                        .find(
                            record =>
                                record.crewId === crewId
                        );

                    if (latest) {
                        latestCrewData[crewId] =
                            fromStoredReading(latest);
                    }
                }

                crewDataRef.current =
                    latestCrewData;

                setCrewData(latestCrewData);

                const selectedReadings =
                    latestCrewData[
                        selectedIdRef.current
                        ];

                setDisplayed(
                    toDisplayed(selectedReadings)
                );

                const selectedHistory = records
                    .filter(
                        record =>
                            record.crewId ===
                            selectedIdRef.current
                    )
                    .slice(-MAX_CHART_SAMPLES);

                if (selectedHistory.length > 0) {
                    setTelemetry({
                        heart: selectedHistory.map(
                            record => record.heart
                        ),
                        oxygen: selectedHistory.map(
                            record => record.oxygen
                        ),
                        temperature: selectedHistory.map(
                            record => record.temperature
                        ),
                        sleep: selectedHistory.map(
                            record => record.sleep
                        ),
                        respiration: selectedHistory.map(
                            record => record.respiration
                        ),
                    });
                }
            } catch {
                if (!cancelled && mountedRef.current) {
                    historyRef.current = [];
                    setHistory([]);
                }
            } finally {
                if (!cancelled && mountedRef.current) {
                    loadedRef.current = true;
                    setHistoryLoaded(true);
                }
            }
        };

        void initialize();

        return () => {
            cancelled = true;
            mountedRef.current = false;
            loadedRef.current = false;
        };
    }, []);

    useEffect(() => {
        const interval = setInterval(
            addSample,
            SAMPLE_INTERVAL_MS
        );

        return () => {
            clearInterval(interval);
        };
    }, [addSample]);

    const value = useMemo<MissionHealthContextValue>(
        () => ({
            telemetry,
            displayed,
            tick,
            selectedId: selectedIdState,
            setSelectedId,
            alertId,
            alertDemo,
            triggerAlert,
            clearAlert,
            reset,
            addSample,
            crewReadings,
            history,
            historyLoaded,
            refreshHistory,
            clearHistory,
            healthAssessment,
            selectedCrewAssessment,
            assessCrew,
            activeAlertCount,
            highestSeverity,
        }),
        [
            telemetry,
            displayed,
            tick,
            selectedIdState,
            setSelectedId,
            alertId,
            alertDemo,
            triggerAlert,
            clearAlert,
            reset,
            addSample,
            crewReadings,
            history,
            historyLoaded,
            refreshHistory,
            clearHistory,
            healthAssessment,
            selectedCrewAssessment,
            assessCrew,
            activeAlertCount,
            highestSeverity,
        ]
    );

    return (
        <MissionHealthContext.Provider value={value}>
            {children}
        </MissionHealthContext.Provider>
    );
}

export function useMissionHealth(): MissionHealthContextValue {
    const context = useContext(
        MissionHealthContext
    );

    if (!context) {
        throw new Error(
            'useMissionHealth must be used within MissionHealthProvider'
        );
    }

    return context;
}
