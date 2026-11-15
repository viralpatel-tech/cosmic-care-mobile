
import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    StyleSheet,
    TouchableOpacity,
    StatusBar,
    useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
    Line,
    Path,
    Circle,
    Rect,
} from 'react-native-svg';
import {
    Activity,
    ArrowLeft,
    ArrowRight,
    BellRing,
    BrainCircuit,
    ChevronDown,
    ChevronRight,
    Clock3,
    Database,
    Heart,
    Info,
    Moon,
    Radio,
    RefreshCw,
    ShieldAlert,
    ShieldCheck,
    Sparkles,
    Thermometer,
    TrendingDown,
    TrendingUp,
    Minus,
    Users,
    Wind,
} from 'lucide-react-native';

import {
    useMissionHealth,
} from '../context/MissionHealthContext';

import type {
    StoredTelemetryReading,
} from '../storage/telemetryStorage';

import {
    predictCrewHealth,
    getPredictionRiskColor,
    getPredictionRiskLabel,
    getPredictionTrendLabel,
    type MetricPrediction,
    type PredictionRisk,
    type PredictionTrend,
} from '../services/predictiveHealthEngine';

import type {
    HealthMetric,
} from '../services/healthAlertEngine';

const C = {
    bg: '#050B18',
    card: '#101D32',
    card2: '#14243B',
    border: '#263A56',
    cyan: '#44E4F4',
    purple: '#A78BFA',
    green: '#4ADEA3',
    pink: '#FB7185',
    yellow: '#FBBF24',
    white: '#F4F8FF',
    muted: '#93A6C4',
    dim: '#657A96',
};

const CREW = [
    {
        id: 'CM-01',
        name: 'Alex Morgan',
        role: 'Commander',
        initials: 'AM',
    },
    {
        id: 'CM-02',
        name: 'Maya Chen',
        role: 'Flight Engineer',
        initials: 'MC',
    },
    {
        id: 'CM-03',
        name: 'Jordan Lee',
        role: 'Mission Specialist',
        initials: 'JL',
    },
    {
        id: 'CM-04',
        name: 'Sam Rivera',
        role: 'Medical Officer',
        initials: 'SR',
    },
];

const METRIC_COLORS: Record<HealthMetric, string> = {
    heart: C.pink,
    oxygen: C.cyan,
    temperature: C.yellow,
    sleep: C.purple,
    respiration: C.green,
};

const METRIC_KEYS: HealthMetric[] = [
    'heart',
    'oxygen',
    'temperature',
    'sleep',
    'respiration',
];

const SAMPLE_INTERVAL_MINUTES = 4500 / 60000;

const CHART_HEIGHT = 180;

function formatNumber(
    value: number | null,
    metric: HealthMetric
): string {
    if (value === null) {
        return '--';
    }

    if (
        metric === 'temperature' ||
        metric === 'sleep'
    ) {
        return value.toFixed(1);
    }

    return String(Math.round(value));
}

function metricIcon(
    metric: HealthMetric,
    color: string,
    size: number = 20
) {
    switch (metric) {
        case 'heart':
            return <Heart color={color} size={size} />;
        case 'oxygen':
            return <Wind color={color} size={size} />;
        case 'temperature':
            return <Thermometer color={color} size={size} />;
        case 'sleep':
            return <Moon color={color} size={size} />;
        case 'respiration':
            return <Activity color={color} size={size} />;
    }
}

function trendIcon(
    trend: PredictionTrend,
    color: string
) {
    switch (trend) {
        case 'increasing':
            return <TrendingUp color={color} size={17} />;
        case 'decreasing':
            return <TrendingDown color={color} size={17} />;
        default:
            return <Minus color={color} size={17} />;
    }
}

function getMetricHistory(
    history: StoredTelemetryReading[],
    metric: HealthMetric
): number[] {
    return history
        .slice(-12)
        .map(record => record[metric])
        .filter(value => Number.isFinite(value));
}

function createPath(
    values: number[],
    min: number,
    max: number,
    width: number,
    height: number,
    left: number,
    top: number
): string {
    if (values.length === 0) {
        return '';
    }

    const range = Math.max(0.0001, max - min);

    return values
        .map((value, index) => {
            const x =
                left +
                (values.length === 1
                    ? width / 2
                    : (index / (values.length - 1)) * width);

            const y =
                top +
                height -
                ((value - min) / range) * height;

            return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
        })
        .join(' ');
}

function ForecastChart({
                           historyValues,
                           prediction,
                           width,
                       }: {
    historyValues: number[];
    prediction: MetricPrediction;
    width: number;
}) {
    const color = METRIC_COLORS[prediction.metric];

    const historical = historyValues.slice(-12);

    const forecast = prediction.forecast.map(
        point => point.value
    );

    const hasForecast =
        historical.length > 0 &&
        forecast.length > 0;

    const allValues = [
        ...historical,
        ...forecast,
    ];

    if (allValues.length === 0) {
        return (
            <View style={styles.emptyChart}>
                <Database color={C.dim} size={27} />

                <Text style={styles.emptyChartText}>
                    No saved telemetry available
                </Text>
            </View>
        );
    }

    const svgWidth = Math.max(250, width);
    const left = 12;
    const right = 12;
    const top = 18;
    const bottom = 25;
    const plotWidth = svgWidth - left - right;
    const plotHeight =
        CHART_HEIGHT - top - bottom;

    const minValue = Math.min(...allValues);
    const maxValue = Math.max(...allValues);

    const padding = Math.max(
        (maxValue - minValue) * 0.2,
        prediction.metric === 'temperature'
            ? 0.15
            : 1
    );

    const min = minValue - padding;
    const max = maxValue + padding;

    const totalSteps =
        Math.max(0, historical.length - 1) +
        forecast.length;

    const pointX = (index: number) =>
        left +
        (totalSteps === 0
            ? plotWidth / 2
            : (index / totalSteps) * plotWidth);

    const pointY = (value: number) =>
        top +
        plotHeight -
        ((value - min) / Math.max(0.0001, max - min)) *
        plotHeight;

    const historyPath = historical
        .map((value, index) => {
            const command = index === 0 ? 'M' : 'L';

            return `${command} ${pointX(index)} ${pointY(value)}`;
        })
        .join(' ');

    const lastHistoryIndex =
        Math.max(0, historical.length - 1);

    const forecastValues = hasForecast
        ? [
            historical[historical.length - 1],
            ...forecast,
        ]
        : [];

    const forecastPath = forecastValues
        .map((value, index) => {
            const command = index === 0 ? 'M' : 'L';

            return `${command} ${pointX(
                lastHistoryIndex + index
            )} ${pointY(value)}`;
        })
        .join(' ');

    const dividerX = pointX(lastHistoryIndex);

    const lastHistoryValue =
        historical[historical.length - 1];

    const lastForecastValue =
        forecast[forecast.length - 1];

    return (
        <View>
            <Svg
                width={svgWidth}
                height={CHART_HEIGHT}
                viewBox={`0 0 ${svgWidth} ${CHART_HEIGHT}`}
            >
                {[0, 1, 2, 3].map(index => {
                    const y =
                        top + (index / 3) * plotHeight;

                    return (
                        <Line
                            key={index}
                            x1={left}
                            y1={y}
                            x2={svgWidth - right}
                            y2={y}
                            stroke="#29405A"
                            strokeWidth={1}
                            strokeDasharray="4 5"
                        />
                    );
                })}

                {hasForecast && (
                    <Rect
                        x={dividerX}
                        y={top}
                        width={Math.max(
                            0,
                            svgWidth - right - dividerX
                        )}
                        height={plotHeight}
                        fill={color}
                        fillOpacity={0.07}
                    />
                )}

                {hasForecast && (
                    <Line
                        x1={dividerX}
                        y1={top}
                        x2={dividerX}
                        y2={top + plotHeight}
                        stroke={C.muted}
                        strokeWidth={1}
                        strokeDasharray="3 4"
                    />
                )}

                <Path
                    d={historyPath}
                    fill="none"
                    stroke={color}
                    strokeWidth={3}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />

                {hasForecast && (
                    <Path
                        d={forecastPath}
                        fill="none"
                        stroke={C.purple}
                        strokeWidth={3}
                        strokeDasharray="6 5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}

                {lastHistoryValue !== undefined && (
                    <Circle
                        cx={pointX(lastHistoryIndex)}
                        cy={pointY(lastHistoryValue)}
                        r={4}
                        fill={color}
                        stroke={C.card}
                        strokeWidth={2}
                    />
                )}

                {hasForecast &&
                    lastForecastValue !== undefined && (
                        <Circle
                            cx={pointX(totalSteps)}
                            cy={pointY(lastForecastValue)}
                            r={5}
                            fill={C.purple}
                            stroke={C.card}
                            strokeWidth={2}
                        />
                    )}
            </Svg>

            <View style={styles.chartLegend}>
                <View style={styles.legendItem}>
                    <View
                        style={[
                            styles.legendDot,
                            { backgroundColor: color },
                        ]}
                    />

                    <Text style={styles.legendText}>
                        Historical
                    </Text>
                </View>

                <View style={styles.legendItem}>
                    <View
                        style={[
                            styles.legendDot,
                            { backgroundColor: C.purple },
                        ]}
                    />

                    <Text style={styles.legendText}>
                        Simulated Forecast
                    </Text>
                </View>
            </View>
        </View>
    );
}

function MetricCard({
                        prediction,
                        selected,
                        onPress,
                    }: {
    prediction: MetricPrediction;
    selected: boolean;
    onPress: () => void;
}) {
    const color = METRIC_COLORS[prediction.metric];

    const riskColor = getPredictionRiskColor(
        prediction.risk
    );

    return (
        <TouchableOpacity
            style={[
                styles.metricCard,
                selected && {
                    borderColor: color,
                    backgroundColor: '#172840',
                },
            ]}
            onPress={onPress}
            activeOpacity={0.8}
        >
            <View style={styles.metricCardTop}>
                <View
                    style={[
                        styles.metricIcon,
                        { backgroundColor: color + '18' },
                    ]}
                >
                    {metricIcon(prediction.metric, color)}
                </View>

                <View
                    style={[
                        styles.metricRiskBadge,
                        { backgroundColor: riskColor + '18' },
                    ]}
                >
                    <Text
                        style={[
                            styles.metricRiskText,
                            { color: riskColor },
                        ]}
                    >
                        {getPredictionRiskLabel(
                            prediction.risk
                        )}
                    </Text>
                </View>
            </View>

            <Text style={styles.metricName}>
                {prediction.label}
            </Text>

            <View style={styles.metricValues}>
                <Text style={styles.metricValue}>
                    {formatNumber(
                        prediction.currentValue,
                        prediction.metric
                    )}
                </Text>

                <Text style={styles.metricUnit}>
                    {prediction.unit}
                </Text>
            </View>

            <View style={styles.metricTrend}>
                {trendIcon(
                    prediction.trend,
                    color
                )}

                <Text
                    style={[
                        styles.metricTrendText,
                        { color },
                    ]}
                >
                    {getPredictionTrendLabel(
                        prediction.trend
                    )}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

export default function AnalysisScreen() {
    const router = useRouter();

    const { width: windowWidth } =
        useWindowDimensions();

    const {
        selectedId,
        setSelectedId,
        history,
        historyLoaded,
        tick,
        addSample,
    } = useMissionHealth();

    const [selectedMetric, setSelectedMetric] =
        useState<HealthMetric>('heart');

    const [showCrewPicker, setShowCrewPicker] =
        useState(false);

    const [horizon, setHorizon] =
        useState(5);

    const selectedCrew =
        CREW.find(
            member => member.id === selectedId
        ) ?? CREW[0];

    const crewHistory = useMemo(
        () =>
            history
                .filter(
                    record =>
                        record.crewId === selectedId
                )
                .sort(
                    (a, b) =>
                        Date.parse(a.timestamp) -
                        Date.parse(b.timestamp)
                ),
        [history, selectedId]
    );

    const prediction = useMemo(
        () =>
            predictCrewHealth(
                selectedId,
                history,
                {
                    horizonSteps: horizon,
                    sampleIntervalMinutes:
                    SAMPLE_INTERVAL_MINUTES,
                    maxSamples: 30,
                }
            ),
        [selectedId, history, horizon]
    );

    const activePrediction =
        prediction.metrics.find(
            metric =>
                metric.metric === selectedMetric
        ) ?? prediction.metrics[0];

    const chartHistory = useMemo(
        () =>
            getMetricHistory(
                crewHistory,
                selectedMetric
            ),
        [crewHistory, selectedMetric]
    );

    const chartWidth = Math.max(
        250,
        windowWidth - 74
    );

    const riskColor =
        getPredictionRiskColor(
            prediction.overallRisk
        );

    const hasForecast =
        prediction.sampleCount >= 3;

    const openAlerts = () =>
        router.push('/alerts');

    const openAI = () =>
        router.push('/aicare');

    const openHistory = () =>
        router.push('/history');

    return (
        <SafeAreaView
            style={styles.root}
            edges={['top']}
        >
            <StatusBar barStyle="light-content" />

            <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => router.replace('/')}
                    >
                        <ArrowLeft color={C.white} size={22} />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <Text style={styles.brand}>
                            ✦ COSMIC CARE
                        </Text>

                        <Text style={styles.headerSubtitle}>
                            PREDICTIVE MISSION ANALYTICS
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={openAlerts}
                    >
                        <BellRing color={C.cyan} size={22} />
                    </TouchableOpacity>
                </View>

                <LinearGradient
                    colors={['#28234E', '#172B48', '#101D32']}
                    style={styles.hero}
                >
                    <View style={styles.heroTop}>
                        <View style={styles.heroBadge}>
                            <Sparkles color={C.purple} size={15} />

                            <Text style={styles.heroBadgeText}>
                                ADVANCED MISSION INTELLIGENCE
                            </Text>
                        </View>

                        <View style={styles.liveBadge}>
                            <Radio color={C.green} size={13} />

                            <Text style={styles.liveBadgeText}>
                                SIMULATION
                            </Text>
                        </View>
                    </View>

                    <View style={styles.heroIcon}>
                        <BrainCircuit
                            color={C.purple}
                            size={34}
                        />
                    </View>

                    <Text style={styles.heroTitle}>
                        Predictive Health Analytics
                    </Text>

                    <Text style={styles.heroDescription}>
                        Explore mathematical forecasts
                        generated from fictional astronaut
                        telemetry and illustrative
                        health thresholds.
                    </Text>

                    <View style={styles.heroDivider} />

                    <View style={styles.heroStats}>
                        <View>
                            <Text style={styles.heroStatValue}>
                                {prediction.sampleCount}
                            </Text>

                            <Text style={styles.heroStatLabel}>
                                DATA SAMPLES
                            </Text>
                        </View>

                        <View>
                            <Text style={styles.heroStatValue}>
                                {prediction.confidence.toUpperCase()}
                            </Text>

                            <Text style={styles.heroStatLabel}>
                                HEURISTIC CONFIDENCE
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>
                        Selected Astronaut
                    </Text>

                    <Users color={C.muted} size={20} />
                </View>

                <TouchableOpacity
                    style={styles.crewPicker}
                    onPress={() =>
                        setShowCrewPicker(value => !value)
                    }
                >
                    <View style={styles.avatar}>
                        <Text style={styles.avatarText}>
                            {selectedCrew.initials}
                        </Text>
                    </View>

                    <View style={styles.crewDetails}>
                        <Text style={styles.crewName}>
                            {selectedCrew.name}
                        </Text>

                        <Text style={styles.crewRole}>
                            {selectedCrew.role} · {selectedCrew.id}
                        </Text>
                    </View>

                    <ChevronDown color={C.cyan} size={20} />
                </TouchableOpacity>

                {showCrewPicker && (
                    <View style={styles.crewMenu}>
                        {CREW.map(member => (
                            <TouchableOpacity
                                key={member.id}
                                style={styles.crewOption}
                                onPress={() => {
                                    setSelectedId(member.id);
                                    setShowCrewPicker(false);
                                }}
                            >
                                <Text
                                    style={[
                                        styles.crewOptionName,
                                        selectedId === member.id && {
                                            color: C.cyan,
                                        },
                                    ]}
                                >
                                    {member.name}
                                </Text>

                                <Text style={styles.crewOptionId}>
                                    {member.id}
                                </Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                )}

                <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>
                        Forecast Assessment
                    </Text>

                    <TouchableOpacity
                        style={styles.refreshButton}
                        onPress={addSample}
                    >
                        <RefreshCw color={C.cyan} size={18} />
                    </TouchableOpacity>
                </View>

                <View
                    style={[
                        styles.riskCard,
                        { borderColor: riskColor + '65' },
                    ]}
                >
                    <View style={styles.riskTop}>
                        <View
                            style={[
                                styles.riskIcon,
                                { backgroundColor: riskColor + '18' },
                            ]}
                        >
                            {prediction.overallRisk === 'low' ? (
                                <ShieldCheck
                                    color={riskColor}
                                    size={27}
                                />
                            ) : (
                                <ShieldAlert
                                    color={riskColor}
                                    size={27}
                                />
                            )}
                        </View>

                        <View style={styles.riskDetails}>
                            <Text style={styles.riskLabel}>
                                PROJECTED DEMO RISK
                            </Text>

                            <Text
                                style={[
                                    styles.riskValue,
                                    { color: riskColor },
                                ]}
                            >
                                {hasForecast
                                    ? getPredictionRiskLabel(
                                        prediction.overallRisk
                                    )
                                    : 'Insufficient Data'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.scoreComparison}>
                        <View style={styles.scoreBlock}>
                            <Text style={styles.scoreLabel}>
                                CURRENT SCORE
                            </Text>

                            <Text style={styles.scoreValue}>
                                {prediction.currentHealthScore ?? '--'}
                            </Text>
                        </View>

                        <ArrowRight
                            color={C.muted}
                            size={21}
                        />

                        <View style={styles.scoreBlock}>
                            <Text style={styles.scoreLabel}>
                                PROJECTED SCORE
                            </Text>

                            <Text
                                style={[
                                    styles.scoreValue,
                                    { color: riskColor },
                                ]}
                            >
                                {prediction.predictedHealthScore ?? '--'}
                            </Text>
                        </View>
                    </View>

                    <Text style={styles.riskDescription}>
                        {hasForecast
                            ? `Based on ${prediction.sampleCount} fictional samples. This is an illustrative projection, not a validated prediction.`
                            : 'At least three saved samples are needed to generate a mathematical forecast.'}
                    </Text>
                </View>

                <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>
                        Biometric Forecasts
                    </Text>

                    <Activity color={C.cyan} size={20} />
                </View>

                <Text style={styles.sectionDescription}>
                    Select a metric to explore its
                    historical readings and projected
                    demonstration trend.
                </Text>

                <View style={styles.metricsGrid}>
                    {prediction.metrics.map(metric => (
                        <MetricCard
                            key={metric.metric}
                            prediction={metric}
                            selected={
                                selectedMetric === metric.metric
                            }
                            onPress={() =>
                                setSelectedMetric(metric.metric)
                            }
                        />
                    ))}
                </View>

                <View style={styles.chartCard}>
                    <View style={styles.chartHeader}>
                        <View
                            style={[
                                styles.chartIcon,
                                {
                                    backgroundColor:
                                        METRIC_COLORS[selectedMetric] + '18',
                                },
                            ]}
                        >
                            {metricIcon(
                                selectedMetric,
                                METRIC_COLORS[selectedMetric],
                                23
                            )}
                        </View>

                        <View style={styles.chartHeading}>
                            <Text style={styles.chartTitle}>
                                {activePrediction.label}
                            </Text>

                            <Text style={styles.chartSubtitle}>
                                Historical vs. simulated forecast
                            </Text>
                        </View>
                    </View>

                    <View style={styles.horizonRow}>
                        <Text style={styles.horizonLabel}>
                            FORECAST STEPS
                        </Text>

                        <View style={styles.horizonOptions}>
                            {[3, 5, 10].map(value => (
                                <TouchableOpacity
                                    key={value}
                                    style={[
                                        styles.horizonButton,
                                        horizon === value &&
                                        styles.horizonButtonActive,
                                    ]}
                                    onPress={() => setHorizon(value)}
                                >
                                    <Text
                                        style={[
                                            styles.horizonButtonText,
                                            horizon === value && {
                                                color: C.cyan,
                                            },
                                        ]}
                                    >
                                        {value}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    <ForecastChart
                        historyValues={chartHistory}
                        prediction={activePrediction}
                        width={chartWidth}
                    />

                    <View style={styles.chartBottom}>
                        <View>
                            <Text style={styles.chartBottomLabel}>
                                CURRENT
                            </Text>

                            <Text style={styles.chartBottomValue}>
                                {formatNumber(
                                    activePrediction.currentValue,
                                    selectedMetric
                                )}{' '}
                                {activePrediction.unit}
                            </Text>
                        </View>

                        <View>
                            <Text style={styles.chartBottomLabel}>
                                PROJECTED
                            </Text>

                            <Text
                                style={[
                                    styles.chartBottomValue,
                                    { color: C.purple },
                                ]}
                            >
                                {formatNumber(
                                    activePrediction.predictedValue,
                                    selectedMetric
                                )}{' '}
                                {activePrediction.unit}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>
                        Prediction Explanation
                    </Text>

                    <Info color={C.purple} size={20} />
                </View>

                <View style={styles.explanationCard}>
                    <View style={styles.explanationHeader}>
                        <BrainCircuit
                            color={C.purple}
                            size={22}
                        />

                        <Text style={styles.explanationTitle}>
                            Explainable Forecast
                        </Text>
                    </View>

                    <Text style={styles.explanationText}>
                        {activePrediction.explanation}
                    </Text>

                    <View style={styles.explanationDivider} />

                    <View style={styles.explanationRow}>
                        <Text style={styles.explanationLabel}>
                            Trend
                        </Text>

                        <Text style={styles.explanationValue}>
                            {getPredictionTrendLabel(
                                activePrediction.trend
                            )}
                        </Text>
                    </View>

                    <View style={styles.explanationRow}>
                        <Text style={styles.explanationLabel}>
                            Heuristic confidence
                        </Text>

                        <Text style={styles.explanationValue}>
                            {activePrediction.confidence.toUpperCase()}
                        </Text>
                    </View>

                    <View style={styles.explanationRow}>
                        <Text style={styles.explanationLabel}>
                            Samples analyzed
                        </Text>

                        <Text style={styles.explanationValue}>
                            {activePrediction.sampleCount}
                        </Text>
                    </View>

                    <View style={styles.explanationRow}>
                        <Text style={styles.explanationLabel}>
                            Projected risk
                        </Text>

                        <Text
                            style={[
                                styles.explanationValue,
                                {
                                    color: getPredictionRiskColor(
                                        activePrediction.risk
                                    ),
                                },
                            ]}
                        >
                            {getPredictionRiskLabel(
                                activePrediction.risk
                            )}
                        </Text>
                    </View>
                </View>

                <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>
                        Mission Insights
                    </Text>

                    <Sparkles color={C.purple} size={20} />
                </View>

                <View style={styles.insightsCard}>
                    {prediction.insights.map((insight, index) => (
                        <View
                            key={`${index}-${insight}`}
                            style={styles.insightRow}
                        >
                            <View style={styles.insightNumber}>
                                <Text style={styles.insightNumberText}>
                                    {index + 1}
                                </Text>
                            </View>

                            <Text style={styles.insightText}>
                                {insight}
                            </Text>
                        </View>
                    ))}
                </View>

                <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>
                        Simulated Recommendations
                    </Text>

                    <ShieldCheck color={C.green} size={20} />
                </View>

                <View style={styles.recommendationCard}>
                    {prediction.recommendations.map(
                        (recommendation, index) => (
                            <View
                                key={`${index}-${recommendation}`}
                                style={styles.recommendationRow}
                            >
                                <View style={styles.recommendationDot} />

                                <Text style={styles.recommendationText}>
                                    {recommendation}
                                </Text>
                            </View>
                        )
                    )}
                </View>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={openAI}
                >
                    <BrainCircuit
                        color={C.purple}
                        size={22}
                    />

                    <View style={styles.actionDetails}>
                        <Text style={styles.actionTitle}>
                            Open AI Care
                        </Text>

                        <Text style={styles.actionSubtitle}>
                            Review rule-based mission guidance
                        </Text>
                    </View>

                    <ChevronRight color={C.purple} size={20} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={openHistory}
                >
                    <Database color={C.cyan} size={22} />

                    <View style={styles.actionDetails}>
                        <Text style={styles.actionTitle}>
                            Mission History
                        </Text>

                        <Text style={styles.actionSubtitle}>
                            View saved fictional telemetry
                        </Text>
                    </View>

                    <ChevronRight color={C.cyan} size={20} />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionButton}
                    onPress={openAlerts}
                >
                    <BellRing color={C.yellow} size={22} />

                    <View style={styles.actionDetails}>
                        <Text style={styles.actionTitle}>
                            Mission Alert Center
                        </Text>

                        <Text style={styles.actionSubtitle}>
                            Inspect current demonstration alerts
                        </Text>
                    </View>

                    <ChevronRight color={C.yellow} size={20} />
                </TouchableOpacity>

                <View style={styles.dataStatus}>
                    <Clock3 color={C.cyan} size={17} />

                    <Text style={styles.dataStatusText}>
                        {historyLoaded
                            ? `${crewHistory.length} saved records · Simulation tick ${tick}`
                            : 'Loading telemetry history...'}
                    </Text>
                </View>

                <View style={styles.disclaimer}>
                    <Info color={C.cyan} size={20} />

                    <Text style={styles.disclaimerText}>
                        {prediction.disclaimer}
                        {'\n\n'}
                        Forecast timestamps assume a
                        4.5-second sampling interval.
                        Predictions are not calibrated
                        for actual astronaut physiology.
                    </Text>
                </View>

                <Text style={styles.footer}>
                    COSMIC CARE · MISSION CC-01
                    {'\n'}
                    PREDICTIVE ANALYTICS DEMONSTRATION
                </Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: {
        flex: 1,
        backgroundColor: C.bg,
    },
    content: {
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 55,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 22,
    },
    backButton: {
        width: 42,
        height: 42,
        borderRadius: 13,
        backgroundColor: C.card,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: {
        flex: 1,
        marginLeft: 12,
    },
    brand: {
        color: C.cyan,
        fontSize: 15,
        fontWeight: '900',
        letterSpacing: 1,
    },
    headerSubtitle: {
        color: C.muted,
        fontSize: 9,
        marginTop: 5,
        letterSpacing: 1,
    },
    headerButton: {
        width: 42,
        height: 42,
        borderRadius: 13,
        backgroundColor: '#153047',
        alignItems: 'center',
        justifyContent: 'center',
    },
    hero: {
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#493E76',
        padding: 20,
        marginBottom: 25,
    },
    heroTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: 8,
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: '#332B59',
        borderRadius: 20,
        paddingHorizontal: 10,
        paddingVertical: 7,
    },
    heroBadgeText: {
        color: '#C7B6FF',
        fontSize: 8,
        fontWeight: '900',
    },
    liveBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#183B3A',
        borderRadius: 20,
        paddingHorizontal: 9,
        paddingVertical: 7,
    },
    liveBadgeText: {
        color: C.green,
        fontSize: 9,
        fontWeight: '900',
    },
    heroIcon: {
        width: 69,
        height: 69,
        borderRadius: 21,
        backgroundColor: '#332B59',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 25,
        marginBottom: 17,
    },
    heroTitle: {
        color: C.white,
        fontSize: 25,
        fontWeight: '900',
    },
    heroDescription: {
        color: '#B9B5D9',
        fontSize: 12,
        lineHeight: 21,
        marginTop: 10,
    },
    heroDivider: {
        height: 1,
        backgroundColor: '#514A74',
        marginVertical: 20,
    },
    heroStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    heroStatValue: {
        color: C.white,
        fontSize: 18,
        fontWeight: '900',
    },
    heroStatLabel: {
        color: '#AAA8C9',
        fontSize: 9,
        marginTop: 7,
    },
    sectionHeading: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 10,
        marginBottom: 14,
    },
    sectionTitle: {
        color: C.white,
        fontSize: 19,
        fontWeight: '900',
    },
    crewPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 15,
        padding: 13,
        marginBottom: 19,
    },
    avatar: {
        width: 44,
        height: 44,
        borderRadius: 13,
        backgroundColor: '#19485A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    avatarText: {
        color: C.cyan,
        fontSize: 14,
        fontWeight: '900',
    },
    crewDetails: {
        flex: 1,
        marginLeft: 12,
    },
    crewName: {
        color: C.white,
        fontSize: 14,
        fontWeight: '900',
    },
    crewRole: {
        color: C.muted,
        fontSize: 11,
        marginTop: 5,
    },
    crewMenu: {
        backgroundColor: C.card2,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 14,
        marginTop: -10,
        marginBottom: 20,
        overflow: 'hidden',
    },
    crewOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    crewOptionName: {
        color: C.white,
        fontSize: 13,
        fontWeight: '700',
    },
    crewOptionId: {
        color: C.muted,
        fontSize: 11,
    },
    refreshButton: {
        width: 35,
        height: 35,
        borderRadius: 11,
        backgroundColor: '#15384B',
        alignItems: 'center',
        justifyContent: 'center',
    },
    riskCard: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderRadius: 17,
        padding: 17,
        marginBottom: 24,
    },
    riskTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    riskIcon: {
        width: 48,
        height: 48,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    riskDetails: {
        flex: 1,
        marginLeft: 12,
    },
    riskLabel: {
        color: C.muted,
        fontSize: 10,
        marginBottom: 6,
    },
    riskValue: {
        fontSize: 17,
        fontWeight: '900',
    },
    scoreComparison: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-around',
        marginTop: 25,
        marginBottom: 18,
    },
    scoreBlock: {
        alignItems: 'center',
    },
    scoreLabel: {
        color: C.muted,
        fontSize: 10,
        marginBottom: 9,
    },
    scoreValue: {
        color: C.white,
        fontSize: 30,
        fontWeight: '900',
    },
    riskDescription: {
        color: C.muted,
        fontSize: 11,
        lineHeight: 19,
    },
    sectionDescription: {
        color: C.muted,
        fontSize: 12,
        lineHeight: 20,
        marginBottom: 16,
    },
    metricsGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    metricCard: {
        width: '48%',
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 15,
        padding: 14,
        marginBottom: 12,
    },
    metricCardTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    metricIcon: {
        width: 36,
        height: 36,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    metricRiskBadge: {
        borderRadius: 8,
        paddingHorizontal: 7,
        paddingVertical: 6,
    },
    metricRiskText: {
        fontSize: 9,
        fontWeight: '900',
    },
    metricName: {
        color: C.muted,
        fontSize: 11,
        marginTop: 15,
    },
    metricValues: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 5,
        marginTop: 7,
    },
    metricValue: {
        color: C.white,
        fontSize: 24,
        fontWeight: '900',
    },
    metricUnit: {
        color: C.muted,
        fontSize: 10,
    },
    metricTrend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 12,
    },
    metricTrendText: {
        fontSize: 10,
        fontWeight: '800',
    },
    chartCard: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 17,
        padding: 16,
        marginBottom: 24,
    },
    chartHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
    },
    chartIcon: {
        width: 46,
        height: 46,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartHeading: {
        marginLeft: 12,
        flex: 1,
    },
    chartTitle: {
        color: C.white,
        fontSize: 16,
        fontWeight: '900',
    },
    chartSubtitle: {
        color: C.muted,
        fontSize: 10,
        marginTop: 5,
    },
    horizonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    horizonLabel: {
        color: C.muted,
        fontSize: 10,
    },
    horizonOptions: {
        flexDirection: 'row',
        gap: 6,
    },
    horizonButton: {
        backgroundColor: '#1D2E46',
        borderRadius: 8,
        paddingHorizontal: 13,
        paddingVertical: 8,
    },
    horizonButtonActive: {
        backgroundColor: '#174457',
    },
    horizonButtonText: {
        color: C.muted,
        fontSize: 11,
        fontWeight: '800',
    },
    emptyChart: {
        height: CHART_HEIGHT,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    emptyChartText: {
        color: C.muted,
        fontSize: 12,
    },
    chartLegend: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 19,
        marginTop: 4,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
    },
    legendDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    legendText: {
        color: C.muted,
        fontSize: 10,
    },
    chartBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: C.border,
        paddingTop: 17,
        marginTop: 17,
    },
    chartBottomLabel: {
        color: C.muted,
        fontSize: 9,
        marginBottom: 8,
    },
    chartBottomValue: {
        color: C.white,
        fontSize: 16,
        fontWeight: '900',
    },
    explanationCard: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 17,
        padding: 17,
        marginBottom: 24,
    },
    explanationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 11,
    },
    explanationTitle: {
        color: C.white,
        fontSize: 15,
        fontWeight: '900',
    },
    explanationText: {
        color: '#B8C8DB',
        fontSize: 12,
        lineHeight: 21,
        marginTop: 15,
    },
    explanationDivider: {
        height: 1,
        backgroundColor: C.border,
        marginVertical: 18,
    },
    explanationRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 13,
    },
    explanationLabel: {
        color: C.muted,
        fontSize: 11,
    },
    explanationValue: {
        color: C.white,
        fontSize: 11,
        fontWeight: '800',
    },
    insightsCard: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 17,
        padding: 17,
        marginBottom: 24,
    },
    insightRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 14,
    },
    insightNumber: {
        width: 24,
        height: 24,
        borderRadius: 8,
        backgroundColor: '#342D59',
        alignItems: 'center',
        justifyContent: 'center',
    },
    insightNumberText: {
        color: C.purple,
        fontSize: 11,
        fontWeight: '900',
    },
    insightText: {
        flex: 1,
        color: '#B8C8DB',
        fontSize: 12,
        lineHeight: 20,
    },
    recommendationCard: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 17,
        padding: 17,
        marginBottom: 22,
    },
    recommendationRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 12,
        marginBottom: 15,
    },
    recommendationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: C.green,
        marginTop: 6,
    },
    recommendationText: {
        flex: 1,
        color: '#B8C8DB',
        fontSize: 12,
        lineHeight: 20,
    },
    actionButton: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 15,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 11,
    },
    actionDetails: {
        flex: 1,
        marginLeft: 13,
    },
    actionTitle: {
        color: C.white,
        fontSize: 13,
        fontWeight: '900',
    },
    actionSubtitle: {
        color: C.muted,
        fontSize: 11,
        marginTop: 5,
    },
    dataStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        marginTop: 18,
        marginBottom: 20,
    },
    dataStatusText: {
        color: C.muted,
        fontSize: 11,
    },
    disclaimer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 11,
        backgroundColor: '#11283A',
        borderRadius: 14,
        padding: 15,
    },
    disclaimerText: {
        flex: 1,
        color: '#AFC4D6',
        fontSize: 11,
        lineHeight: 19,
    },
    footer: {
        color: C.dim,
        fontSize: 9,
        textAlign: 'center',
        lineHeight: 18,
        marginTop: 27,
    },
});
