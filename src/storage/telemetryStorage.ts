
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = '@cosmic_care/telemetry_history_v1';

const MAX_RECORDS = 1000;

export type StoredTelemetryReading = {
    id: string;
    timestamp: string;
    crewId: string;
    heart: number;
    oxygen: number;
    temperature: number;
    sleep: number;
    respiration: number;
    demoAlert: boolean;
};

export type TelemetrySnapshot = Omit<
    StoredTelemetryReading,
    'id' | 'timestamp' | 'demoAlert'
> & {
    demoAlert?: boolean;
};

type LegacyTelemetryReading = Omit<
    StoredTelemetryReading,
    'demoAlert'
> & {
    demoAlert?: boolean;
};

function isRecord(
    value: unknown
): value is Record<string, unknown> {
    return (
        typeof value === 'object' &&
        value !== null &&
        !Array.isArray(value)
    );
}

function isFiniteNumber(
    value: unknown
): value is number {
    return (
        typeof value === 'number' &&
        Number.isFinite(value)
    );
}

function normalizeReading(
    value: unknown
): StoredTelemetryReading | null {
    if (!isRecord(value)) {
        return null;
    }

    if (
        typeof value.id !== 'string' ||
        typeof value.timestamp !== 'string' ||
        typeof value.crewId !== 'string'
    ) {
        return null;
    }

    if (
        !isFiniteNumber(value.heart) ||
        !isFiniteNumber(value.oxygen) ||
        !isFiniteNumber(value.temperature) ||
        !isFiniteNumber(value.sleep) ||
        !isFiniteNumber(value.respiration)
    ) {
        return null;
    }

    if (
        !Number.isFinite(
            new Date(value.timestamp).getTime()
        )
    ) {
        return null;
    }

    return {
        id: value.id,
        timestamp: value.timestamp,
        crewId: value.crewId,
        heart: value.heart,
        oxygen: value.oxygen,
        temperature: value.temperature,
        sleep: value.sleep,
        respiration: value.respiration,
        demoAlert: value.demoAlert === true,
    };
}

function normalizeHistory(
    value: unknown
): StoredTelemetryReading[] {
    if (!Array.isArray(value)) {
        return [];
    }

    const normalized: StoredTelemetryReading[] = [];

    for (const item of value) {
        const reading = normalizeReading(item);

        if (reading) {
            normalized.push(reading);
        }
    }

    return normalized
        .sort(
            (a, b) =>
                new Date(a.timestamp).getTime() -
                new Date(b.timestamp).getTime()
        )
        .slice(-MAX_RECORDS);
}

let storageQueue: Promise<unknown> = Promise.resolve();

function runStorageOperation<T>(
    operation: () => Promise<T>
): Promise<T> {
    const result = storageQueue.then(
        operation,
        operation
    );

    storageQueue = result.then(
        () => undefined,
        () => undefined
    );

    return result;
}

async function readHistoryFromStorage(): Promise<
    StoredTelemetryReading[]
> {
    const raw = await AsyncStorage.getItem(
        STORAGE_KEY
    );

    if (!raw) {
        return [];
    }

    try {
        const parsed: unknown = JSON.parse(raw);

        return normalizeHistory(parsed);
    } catch {
        return [];
    }
}

async function writeHistoryToStorage(
    history: StoredTelemetryReading[]
): Promise<void> {
    await AsyncStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(
            normalizeHistory(history)
        )
    );
}

export async function loadTelemetryHistory(): Promise<
    StoredTelemetryReading[]
> {
    return runStorageOperation(
        readHistoryFromStorage
    );
}

export async function saveTelemetryHistory(
    history: LegacyTelemetryReading[]
): Promise<void> {
    return runStorageOperation(async () => {
        await writeHistoryToStorage(
            normalizeHistory(history)
        );
    });
}

export async function appendTelemetryReading(
    snapshot: TelemetrySnapshot
): Promise<StoredTelemetryReading> {
    return runStorageOperation(async () => {
        const current =
            await readHistoryFromStorage();

        const timestamp =
            new Date().toISOString();

        const record: StoredTelemetryReading = {
            id: `${snapshot.crewId}-${Date.now()}-${Math.random()
                .toString(36)
                .slice(2, 10)}`,
            timestamp,
            crewId: snapshot.crewId,
            heart: snapshot.heart,
            oxygen: snapshot.oxygen,
            temperature: snapshot.temperature,
            sleep: snapshot.sleep,
            respiration: snapshot.respiration,
            demoAlert: snapshot.demoAlert ?? false,
        };

        await writeHistoryToStorage([
            ...current,
            record,
        ]);

        return record;
    });
}

export async function getCrewTelemetryHistory(
    crewId: string
): Promise<StoredTelemetryReading[]> {
    const history =
        await loadTelemetryHistory();

    return history.filter(
        record => record.crewId === crewId
    );
}

export async function getRecentTelemetryHistory(
    limit: number = 50
): Promise<StoredTelemetryReading[]> {
    const history =
        await loadTelemetryHistory();

    const safeLimit = Number.isFinite(limit)
        ? Math.max(0, Math.floor(limit))
        : 50;

    if (safeLimit === 0) {
        return [];
    }

    return history
        .slice(-safeLimit)
        .reverse();
}

export async function getTelemetryRecordCount(): Promise<number> {
    const history =
        await loadTelemetryHistory();

    return history.length;
}

export async function clearTelemetryHistory(): Promise<void> {
    return runStorageOperation(async () => {
        await AsyncStorage.removeItem(
            STORAGE_KEY
        );
    });
}
