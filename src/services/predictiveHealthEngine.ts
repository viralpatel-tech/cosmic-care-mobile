
import type {
    StoredTelemetryReading,
} from '../storage/telemetryStorage';

import {
    assessHealth,
    type HealthMetric,
    type HealthReadings,
    type AlertSeverity,
} from './healthAlertEngine';

export type PredictionTrend =
    | 'increasing'
    | 'decreasing'
    | 'stable'
    | 'insufficient_data';

export type PredictionConfidence =
    | 'low'
    | 'moderate'
    | 'high';

export type PredictionRisk =
    | 'low'
    | 'elevated'
    | 'high'
    | 'critical';

export type ForecastPoint = {
    step: number;
    value: number;
    timestamp: string;
};

export type MetricPrediction = {
    metric: HealthMetric;
    label: string;
    unit: string;
    currentValue: number | null;
    predictedValue: number | null;
    change: number | null;
    trend: PredictionTrend;
    confidence: PredictionConfidence;
    risk: PredictionRisk;
    severity: AlertSeverity;
    sampleCount: number;
    forecast: ForecastPoint[];
    explanation: string;
};

export type CrewPrediction = {
    crewId: string;
    generatedAt: string;
    latestTimestamp: string | null;
    sampleCount: number;
    overallRisk: PredictionRisk;
    confidence: PredictionConfidence;
    predictedHealthScore: number | null;
    currentHealthScore: number | null;
    metrics: MetricPrediction[];
    insights: string[];
    recommendations: string[];
    disclaimer: string;
};

export type MissionPrediction = {
    generatedAt: string;
    crewCount: number;
    analyzedCrewCount: number;
    overallRisk: PredictionRisk;
    averagePredictedScore: number | null;
    crew: CrewPrediction[];
    flaggedCrewIds: string[];
    summary: string;
};

export type PredictionOptions = {
    horizonSteps?: number;
    sampleIntervalMinutes?: number;
    maxSamples?: number;
};

type MetricConfiguration = {
    metric: HealthMetric;
    label: string;
    unit: string;
    precision: number;
    stableThreshold: number;
    minimum: number;
    maximum: number;
};

const METRICS: MetricConfiguration[] = [
    {
        metric: 'heart',
        label: 'Heart Rate',
        unit: 'BPM',
        precision: 0,
        stableThreshold: 1.5,
        minimum: 30,
        maximum: 180,
    },
    {
        metric: 'oxygen',
        label: 'Oxygen Saturation',
        unit: '%',
        precision: 0,
        stableThreshold: 0.4,
        minimum: 70,
        maximum: 100,
    },
    {
        metric: 'temperature',
        label: 'Body Temperature',
        unit: '°C',
        precision: 1,
        stableThreshold: 0.08,
        minimum: 33,
        maximum: 42,
    },
    {
        metric: 'sleep',
        label: 'Sleep Duration',
        unit: 'hours',
        precision: 1,
        stableThreshold: 0.15,
        minimum: 0,
        maximum: 12,
    },
    {
        metric: 'respiration',
        label: 'Respiratory Rate',
        unit: '/min',
        precision: 0,
        stableThreshold: 0.7,
        minimum: 5,
        maximum: 40,
    },
];

const DEFAULT_DISCLAIMER =
    'Educational simulation only. Forecasts use simple mathematical extrapolation of fictional telemetry. They are not medical predictions or validated astronaut health assessments.';

const RISK_RANK: Record<PredictionRisk, number> = {
    low: 0,
    elevated: 1,
    high: 2,
    critical: 3,
};

const SEVERITY_RANK: Record<AlertSeverity, number> = {
    normal: 0,
    advisory: 1,
    warning: 2,
    critical: 3,
};

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
    precision: number
): number {
    const factor = Math.pow(10, precision);

    return Math.round(value * factor) / factor;
}

function average(values: number[]): number {
    if (values.length === 0) {
        return 0;
    }

    return (
        values.reduce(
            (sum, value) => sum + value,
            0
        ) / values.length
    );
}

function standardDeviation(
    values: number[]
): number {
    if (values.length < 2) {
        return 0;
    }

    const mean = average(values);

    const variance = average(
        values.map(
            value => Math.pow(value - mean, 2)
        )
    );

    return Math.sqrt(variance);
}

function getRiskFromSeverity(
    severity: AlertSeverity
): PredictionRisk {
    switch (severity) {
        case 'critical':
            return 'critical';
        case 'warning':
            return 'high';
        case 'advisory':
            return 'elevated';
        default:
            return 'low';
    }
}

function highestRisk(
    risks: PredictionRisk[]
): PredictionRisk {
    return risks.reduce<PredictionRisk>(
        (highest, risk) =>
            RISK_RANK[risk] > RISK_RANK[highest]
                ? risk
                : highest,
        'low'
    );
}

function getMetricValue(
    reading: StoredTelemetryReading,
    metric: HealthMetric
): number {
    return reading[metric];
}

function validTimestamp(
    timestamp: string
): number | null {
    const value = Date.parse(timestamp);

    return Number.isFinite(value)
        ? value
        : null;
}

function getSortedCrewHistory(
    crewId: string,
    history: StoredTelemetryReading[],
    maxSamples: number
): StoredTelemetryReading[] {
    return history
        .filter(
            reading =>
                reading.crewId === crewId &&
                validTimestamp(
                    reading.timestamp
                ) !== null &&
                METRICS.every(
                    config =>
                        Number.isFinite(
                            getMetricValue(
                                reading,
                                config.metric
                            )
                        )
                )
        )
        .sort(
            (a, b) =>
                Date.parse(a.timestamp) -
                Date.parse(b.timestamp)
        )
        .slice(-maxSamples);
}

function calculateSlope(
    values: number[]
): number {
    const count = values.length;

    if (count < 2) {
        return 0;
    }

    const meanX = (count - 1) / 2;
    const meanY = average(values);

    let numerator = 0;
    let denominator = 0;

    for (let index = 0; index < count; index++) {
        const dx = index - meanX;

        numerator +=
            dx * (values[index] - meanY);

        denominator += dx * dx;
    }

    if (denominator === 0) {
        return 0;
    }

    return numerator / denominator;
}

function getTrend(
    slope: number,
    threshold: number,
    count: number
): PredictionTrend {
    if (count < 3) {
        return 'insufficient_data';
    }

    if (slope > threshold) {
        return 'increasing';
    }

    if (slope < -threshold) {
        return 'decreasing';
    }

    return 'stable';
}

function getConfidence(
    count: number,
    volatility: number,
    mean: number
): PredictionConfidence {
    if (count < 5) {
        return 'low';
    }

    const relativeVolatility =
        Math.abs(mean) > 0.001
            ? volatility / Math.abs(mean)
            : volatility;

    if (
        count >= 12 &&
        relativeVolatility < 0.03
    ) {
        return 'high';
    }

    if (
        count >= 6 &&
        relativeVolatility < 0.1
    ) {
        return 'moderate';
    }

    return 'low';
}

function buildForecast(
    current: number,
    slope: number,
    latestTimestamp: string,
    config: MetricConfiguration,
    horizonSteps: number,
    intervalMinutes: number
): ForecastPoint[] {
    const start = Date.parse(latestTimestamp);

    const forecast: ForecastPoint[] = [];

    for (
        let step = 1;
        step <= horizonSteps;
        step++
    ) {
        const projected = clamp(
            current + slope * step,
            config.minimum,
            config.maximum
        );

        forecast.push({
            step,
            value: round(
                projected,
                config.precision
            ),
            timestamp: new Date(
                start +
                step *
                intervalMinutes *
                60_000
            ).toISOString(),
        });
    }

    return forecast;
}

function buildMetricExplanation(
    config: MetricConfiguration,
    count: number,
    trend: PredictionTrend,
    current: number | null,
    predicted: number | null,
    confidence: PredictionConfidence,
    risk: PredictionRisk
): string {
    if (
        count < 3 ||
        current === null ||
        predicted === null
    ) {
        return `Not enough fictional ${config.label.toLowerCase()} readings are available to estimate a trend. At least three samples are required.`;
    }

    const trendDescription =
        trend === 'increasing'
            ? 'an upward trend'
            : trend === 'decreasing'
                ? 'a downward trend'
                : 'a relatively stable trend';

    return `${config.label} shows ${trendDescription} across ${count} recent simulated samples. The mathematical projection changes from ${current} ${config.unit} to ${predicted} ${config.unit}. Confidence is ${confidence}, and the illustrative projected risk is ${risk}.`;
}

function getLatestReadings(
    history: StoredTelemetryReading[]
): HealthReadings | null {
    const latest = history[history.length - 1];

    if (!latest) {
        return null;
    }

    return {
        heart: latest.heart,
        oxygen: latest.oxygen,
        temperature: latest.temperature,
        sleep: latest.sleep,
        respiration: latest.respiration,
    };
}

function buildPredictedReadings(
    latest: HealthReadings,
    predictions: MetricPrediction[]
): HealthReadings {
    const result: HealthReadings = {
        ...latest,
    };

    for (const prediction of predictions) {
        if (prediction.predictedValue !== null) {
            result[prediction.metric] =
                prediction.predictedValue;
        }
    }

    return result;
}

function buildRecommendations(
    metrics: MetricPrediction[],
    sampleCount: number
): string[] {
    const recommendations: string[] = [];

    if (sampleCount < 5) {
        recommendations.push(
            'Collect additional fictional telemetry samples before interpreting projected trends.'
        );
    }

    const flagged = metrics.filter(
        metric =>
            metric.risk !== 'low' &&
            metric.predictedValue !== null
    );

    for (const metric of flagged) {
        recommendations.push(
            `Review the simulated ${metric.label.toLowerCase()} trend and compare the projection with the current fictional telemetry.`
        );
    }

    if (flagged.length === 0) {
        recommendations.push(
            'Continue routine fictional crew monitoring and compare future demonstration readings with the current baseline.'
        );
    }

    recommendations.push(
        'Use the Mission Alert Center to inspect the illustrative rules behind any active health flags.'
    );

    return [...new Set(recommendations)];
}

function normalizeOptions(
    options: PredictionOptions
): Required<PredictionOptions> {
    const horizonSteps = Number.isFinite(
        options.horizonSteps
    )
        ? Math.floor(options.horizonSteps!)
        : 5;

    const sampleIntervalMinutes =
        Number.isFinite(
            options.sampleIntervalMinutes
        )
            ? options.sampleIntervalMinutes!
            : 1;

    const maxSamples = Number.isFinite(
        options.maxSamples
    )
        ? Math.floor(options.maxSamples!)
        : 30;

    return {
        horizonSteps: clamp(
            horizonSteps,
            1,
            20
        ),
        sampleIntervalMinutes: clamp(
            sampleIntervalMinutes,
            0.01,
            1440
        ),
        maxSamples: clamp(
            maxSamples,
            3,
            1000
        ),
    };
}

export function predictCrewHealth(
    crewId: string,
    history: StoredTelemetryReading[],
    options: PredictionOptions = {}
): CrewPrediction {
    const settings =
        normalizeOptions(options);

    const records =
        getSortedCrewHistory(
            crewId,
            history,
            settings.maxSamples
        );

    const latestRecord =
        records[records.length - 1];

    const metrics: MetricPrediction[] =
        METRICS.map(config => {
            const values = records.map(
                reading =>
                    getMetricValue(
                        reading,
                        config.metric
                    )
            );

            const count = values.length;

            const currentValue =
                count > 0
                    ? values[count - 1]
                    : null;

            const slope =
                calculateSlope(values);

            const trend = getTrend(
                slope,
                config.stableThreshold,
                count
            );

            const volatility =
                standardDeviation(values);

            const confidence =
                getConfidence(
                    count,
                    volatility,
                    average(values)
                );

            const forecast =
                currentValue !== null &&
                latestRecord &&
                count >= 3
                    ? buildForecast(
                        currentValue,
                        slope,
                        latestRecord.timestamp,
                        config,
                        settings.horizonSteps,
                        settings.sampleIntervalMinutes
                    )
                    : [];

            const predictedValue =
                forecast.length > 0
                    ? forecast[
                    forecast.length - 1
                        ].value
                    : null;

            const change =
                predictedValue !== null &&
                currentValue !== null
                    ? round(
                        predictedValue -
                        currentValue,
                        config.precision
                    )
                    : null;

            let severity: AlertSeverity =
                'normal';

            if (
                predictedValue !== null &&
                latestRecord
            ) {
                const projectedReadings: HealthReadings = {
                    heart: latestRecord.heart,
                    oxygen: latestRecord.oxygen,
                    temperature:
                    latestRecord.temperature,
                    sleep: latestRecord.sleep,
                    respiration:
                    latestRecord.respiration,
                };

                projectedReadings[
                    config.metric
                    ] = predictedValue;

                const assessment =
                    assessHealth(
                        projectedReadings
                    );

                const matchingAlert =
                    assessment.alerts.find(
                        alert =>
                            alert.metric ===
                            config.metric
                    );

                severity =
                    matchingAlert?.severity ??
                    'normal';
            }

            const risk =
                getRiskFromSeverity(
                    severity
                );

            return {
                metric: config.metric,
                label: config.label,
                unit: config.unit,
                currentValue,
                predictedValue,
                change,
                trend,
                confidence,
                risk,
                severity,
                sampleCount: count,
                forecast,
                explanation:
                    buildMetricExplanation(
                        config,
                        count,
                        trend,
                        currentValue,
                        predictedValue,
                        confidence,
                        risk
                    ),
            };
        });

    const latestReadings =
        getLatestReadings(records);

    const currentAssessment =
        latestReadings
            ? assessHealth(
                latestReadings
            )
            : null;

    const hasForecast =
        metrics.every(
            metric =>
                metric.predictedValue !== null
        );

    const predictedReadings =
        latestReadings && hasForecast
            ? buildPredictedReadings(
                latestReadings,
                metrics
            )
            : null;

    const predictedAssessment =
        predictedReadings
            ? assessHealth(
                predictedReadings
            )
            : null;

    const currentHealthScore =
        currentAssessment?.score ??
        null;

    const predictedHealthScore =
        predictedAssessment?.score ??
        null;

    const overallRisk =
        highestRisk(
            metrics.map(
                metric => metric.risk
            )
        );

    const confidenceValues =
        metrics.map(
            metric => metric.confidence
        );

    const confidence:
        PredictionConfidence =
        confidenceValues.every(
            value => value === 'high'
        )
            ? 'high'
            : confidenceValues.every(
                value =>
                    value !== 'low'
            )
                ? 'moderate'
                : 'low';

    const insights: string[] = [];

    if (records.length < 3) {
        insights.push(
            'Insufficient historical samples for a mathematical forecast.'
        );
    } else {
        insights.push(
            `${records.length} fictional telemetry samples were analyzed for astronaut ${crewId}.`
        );

        for (const metric of metrics) {
            if (
                metric.trend === 'increasing' ||
                metric.trend === 'decreasing'
            ) {
                insights.push(
                    `${metric.label} shows a ${metric.trend} simulated trend.`
                );
            }
        }

        if (
            currentHealthScore !== null &&
            predictedHealthScore !== null
        ) {
            const difference =
                predictedHealthScore -
                currentHealthScore;

            if (difference < 0) {
                insights.push(
                    `The illustrative health score decreases by ${Math.abs(difference)} points in the projection.`
                );
            } else if (difference > 0) {
                insights.push(
                    `The illustrative health score increases by ${difference} points in the projection.`
                );
            } else {
                insights.push(
                    'The illustrative health score remains unchanged in the projection.'
                );
            }
        }
    }

    return {
        crewId,
        generatedAt:
            new Date().toISOString(),
        latestTimestamp:
            latestRecord?.timestamp ??
            null,
        sampleCount:
        records.length,
        overallRisk,
        confidence,
        predictedHealthScore,
        currentHealthScore,
        metrics,
        insights,
        recommendations:
            buildRecommendations(
                metrics,
                records.length
            ),
        disclaimer:
        DEFAULT_DISCLAIMER,
    };
}

export function predictMissionHealth(
    crewIds: string[],
    history: StoredTelemetryReading[],
    options: PredictionOptions = {}
): MissionPrediction {
    const uniqueCrewIds = [
        ...new Set(crewIds),
    ];

    const crew =
        uniqueCrewIds.map(
            crewId =>
                predictCrewHealth(
                    crewId,
                    history,
                    options
                )
        );

    const analyzedCrew =
        crew.filter(
            member =>
                member.sampleCount >= 3
        );

    const scores =
        analyzedCrew
            .map(
                member =>
                    member.predictedHealthScore
            )
            .filter(
                (score): score is number =>
                    score !== null
            );

    const averagePredictedScore =
        scores.length > 0
            ? Math.round(
                average(scores)
            )
            : null;

    const overallRisk =
        highestRisk(
            analyzedCrew.map(
                member =>
                    member.overallRisk
            )
        );

    const flaggedCrewIds =
        analyzedCrew
            .filter(
                member =>
                    member.overallRisk !== 'low'
            )
            .map(
                member => member.crewId
            );

    const summary =
        analyzedCrew.length === 0
            ? 'No crew members have enough saved fictional telemetry for forecasting.'
            : `${analyzedCrew.length} of ${crew.length} crew members have sufficient simulated data. ${flaggedCrewIds.length} crew members have elevated or higher illustrative projected risk.`;

    return {
        generatedAt:
            new Date().toISOString(),
        crewCount:
        crew.length,
        analyzedCrewCount:
        analyzedCrew.length,
        overallRisk,
        averagePredictedScore,
        crew,
        flaggedCrewIds,
        summary,
    };
}

export function getPredictionRiskColor(
    risk: PredictionRisk
): string {
    switch (risk) {
        case 'critical':
            return '#FB7185';
        case 'high':
            return '#F97373';
        case 'elevated':
            return '#FBBF24';
        default:
            return '#4ADEA3';
    }
}

export function getPredictionRiskLabel(
    risk: PredictionRisk
): string {
    switch (risk) {
        case 'critical':
            return 'Critical';
        case 'high':
            return 'High';
        case 'elevated':
            return 'Elevated';
        default:
            return 'Low';
    }
}

export function getPredictionTrendLabel(
    trend: PredictionTrend
): string {
    switch (trend) {
        case 'increasing':
            return 'Increasing';
        case 'decreasing':
            return 'Decreasing';
        case 'stable':
            return 'Stable';
        default:
            return 'Insufficient Data';
    }
}
