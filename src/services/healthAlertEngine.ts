
export type AlertSeverity =
    | 'normal'
    | 'advisory'
    | 'warning'
    | 'critical';

export type HealthMetric =
    | 'heart'
    | 'oxygen'
    | 'temperature'
    | 'sleep'
    | 'respiration';

export type HealthReadings = {
    heart: number;
    oxygen: number;
    temperature: number;
    sleep: number;
    respiration: number;
};

export type HealthAlert = {
    id: string;
    metric: HealthMetric;
    severity: AlertSeverity;
    title: string;
    message: string;
    recommendation: string;
    value: number;
    unit: string;
};

export type HealthAssessment = {
    severity: AlertSeverity;
    score: number;
    status: string;
    summary: string;
    alerts: HealthAlert[];
    evaluatedAt: string;
};

const severityRank: Record<AlertSeverity, number> = {
    normal: 0,
    advisory: 1,
    warning: 2,
    critical: 3,
};

const severityScore: Record<AlertSeverity, number> = {
    normal: 100,
    advisory: 85,
    warning: 65,
    critical: 35,
};

function createAlert(
    metric: HealthMetric,
    severity: AlertSeverity,
    title: string,
    message: string,
    recommendation: string,
    value: number,
    unit: string
): HealthAlert {
    return {
        id: `${metric}-${severity}`,
        metric,
        severity,
        title,
        message,
        recommendation,
        value,
        unit,
    };
}

function evaluateHeartRate(
    value: number
): HealthAlert | null {
    if (value < 45 || value > 120) {
        return createAlert(
            'heart',
            'critical',
            'Critical Heart Rate Simulation',
            'The simulated heart rate is outside the configured critical range.',
            'Notify the simulated mission medical officer and review the telemetry scenario.',
            value,
            'BPM'
        );
    }

    if (value < 55 || value > 105) {
        return createAlert(
            'heart',
            'warning',
            'Heart Rate Warning',
            'The simulated heart rate is outside the configured monitoring range.',
            'Review the simulated trend and check the selected mission scenario.',
            value,
            'BPM'
        );
    }

    if (value < 60 || value > 95) {
        return createAlert(
            'heart',
            'advisory',
            'Heart Rate Advisory',
            'The simulated heart rate is approaching a monitoring threshold.',
            'Continue observing the fictional telemetry trend.',
            value,
            'BPM'
        );
    }

    return null;
}

function evaluateOxygen(
    value: number
): HealthAlert | null {
    if (value < 90) {
        return createAlert(
            'oxygen',
            'critical',
            'Critical Oxygen Simulation',
            'The simulated oxygen saturation is below the configured critical threshold.',
            'Escalate the fictional scenario to mission medical review.',
            value,
            '%'
        );
    }

    if (value < 94) {
        return createAlert(
            'oxygen',
            'warning',
            'Oxygen Warning',
            'The simulated oxygen reading is below the configured monitoring range.',
            'Review the demonstration telemetry and simulated environmental conditions.',
            value,
            '%'
        );
    }

    if (value < 96) {
        return createAlert(
            'oxygen',
            'advisory',
            'Oxygen Advisory',
            'The simulated oxygen reading is near the configured warning threshold.',
            'Continue monitoring the fictional oxygen trend.',
            value,
            '%'
        );
    }

    return null;
}

function evaluateTemperature(
    value: number
): HealthAlert | null {
    if (value < 35 || value >= 39) {
        return createAlert(
            'temperature',
            'critical',
            'Critical Temperature Simulation',
            'The simulated temperature is outside the configured critical range.',
            'Escalate the fictional temperature event to the mission medical officer.',
            value,
            '°C'
        );
    }

    if (value < 35.8 || value >= 38) {
        return createAlert(
            'temperature',
            'warning',
            'Temperature Warning',
            'The simulated body temperature is outside the configured monitoring range.',
            'Review the fictional environmental and activity conditions.',
            value,
            '°C'
        );
    }

    if (value < 36.1 || value >= 37.5) {
        return createAlert(
            'temperature',
            'advisory',
            'Temperature Advisory',
            'The simulated temperature is approaching a monitoring threshold.',
            'Continue observing the demonstration temperature trend.',
            value,
            '°C'
        );
    }

    return null;
}

function evaluateSleep(
    value: number
): HealthAlert | null {
    if (value < 4) {
        return createAlert(
            'sleep',
            'warning',
            'Sleep Duration Warning',
            'The simulated sleep duration is substantially below the demonstration target.',
            'Review the fictional crew rest schedule and mission workload.',
            value,
            'hrs'
        );
    }

    if (value < 6) {
        return createAlert(
            'sleep',
            'advisory',
            'Sleep Duration Advisory',
            'The simulated sleep duration is below the demonstration target.',
            'Consider a simulated rest-period adjustment.',
            value,
            'hrs'
        );
    }

    return null;
}

function evaluateRespiration(
    value: number
): HealthAlert | null {
    if (value < 8 || value > 28) {
        return createAlert(
            'respiration',
            'critical',
            'Critical Respiration Simulation',
            'The simulated respiratory rate is outside the configured critical range.',
            'Escalate the fictional respiratory event for mission medical review.',
            value,
            '/min'
        );
    }

    if (value < 10 || value > 22) {
        return createAlert(
            'respiration',
            'warning',
            'Respiration Warning',
            'The simulated respiratory rate is outside the configured monitoring range.',
            'Review the demonstration breathing trend.',
            value,
            '/min'
        );
    }

    if (value < 12 || value > 20) {
        return createAlert(
            'respiration',
            'advisory',
            'Respiration Advisory',
            'The simulated respiratory rate is approaching a monitoring threshold.',
            'Continue observing the fictional respiratory readings.',
            value,
            '/min'
        );
    }

    return null;
}

export function assessHealth(
    readings: HealthReadings
): HealthAssessment {
    const values = Object.values(readings);

    if (
        values.some(
            value =>
                typeof value !== 'number' ||
                !Number.isFinite(value)
        )
    ) {
        throw new Error(
            'Cosmic Care: Invalid simulated health readings.'
        );
    }

    const possibleAlerts = [
        evaluateHeartRate(readings.heart),
        evaluateOxygen(readings.oxygen),
        evaluateTemperature(readings.temperature),
        evaluateSleep(readings.sleep),
        evaluateRespiration(readings.respiration),
    ];

    const alerts = possibleAlerts
        .filter(
            (alert): alert is HealthAlert =>
                alert !== null
        )
        .sort(
            (a, b) =>
                severityRank[b.severity] -
                severityRank[a.severity]
        );

    const severity: AlertSeverity =
        alerts.length > 0
            ? alerts[0].severity
            : 'normal';

    const score = Math.max(
        0,
        severityScore[severity] -
        Math.max(0, alerts.length - 1) * 5
    );

    const status =
        severity === 'critical'
            ? 'Critical Demo Alert'
            : severity === 'warning'
                ? 'Warning Detected'
                : severity === 'advisory'
                    ? 'Advisory Detected'
                    : 'Normal Simulation';

    const summary =
        alerts.length === 0
            ? 'All fictional telemetry readings are within the configured demonstration ranges.'
            : `${alerts.length} simulated monitoring alert${alerts.length === 1 ? '' : 's'} detected. Highest severity: ${severity}.`;

    return {
        severity,
        score,
        status,
        summary,
        alerts,
        evaluatedAt: new Date().toISOString(),
    };
}

export function assessCrewHealth(
    crewId: string,
    readings: HealthReadings
): HealthAssessment & { crewId: string } {
    return {
        crewId,
        ...assessHealth(readings),
    };
}

export function getSeverityColor(
    severity: AlertSeverity
): string {
    switch (severity) {
        case 'critical':
            return '#FB7185';
        case 'warning':
            return '#FBBF24';
        case 'advisory':
            return '#60A5FA';
        default:
            return '#4ADEA3';
    }
}

export function getSeverityLabel(
    severity: AlertSeverity
): string {
    switch (severity) {
        case 'critical':
            return 'CRITICAL';
        case 'warning':
            return 'WARNING';
        case 'advisory':
            return 'ADVISORY';
        default:
            return 'NORMAL';
    }
}
