
import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import {
    Activity,
    ArrowLeft,
    ArrowRight,
    BarChart3,
    BrainCircuit,
    ChevronDown,
    ChevronRight,
    CircleCheck,
    Clock3,
    Database,
    Heart,
    Info,
    Moon,
    Radio,
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

import { useMissionHealth } from '../context/MissionHealthContext';

import {
    type HealthMetric,
} from '../services/healthAlertEngine';

import {
    predictMissionHealth,
    getPredictionRiskColor,
    getPredictionRiskLabel,
    getPredictionTrendLabel,
    type CrewPrediction,
    type MetricPrediction,
    type PredictionRisk,
    type PredictionTrend,
} from '../services/predictiveHealthEngine';

const C = {
    bg: '#050B18',
    card: '#101D32',
    elevated: '#152640',
    border: '#263A56',
    cyan: '#44E4F4',
    purple: '#A78BFA',
    green: '#4ADEA3',
    yellow: '#FBBF24',
    pink: '#FB7185',
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
        color: C.cyan,
    },
    {
        id: 'CM-02',
        name: 'Maya Chen',
        role: 'Flight Engineer',
        initials: 'MC',
        color: C.purple,
    },
    {
        id: 'CM-03',
        name: 'Jordan Lee',
        role: 'Mission Specialist',
        initials: 'JL',
        color: C.green,
    },
    {
        id: 'CM-04',
        name: 'Sam Rivera',
        role: 'Medical Officer',
        initials: 'SR',
        color: C.yellow,
    },
];

const METRICS: {
    key: HealthMetric;
    label: string;
    unit: string;
    color: string;
}[] = [
    {
        key: 'heart',
        label: 'Heart Rate',
        unit: 'BPM',
        color: C.pink,
    },
    {
        key: 'oxygen',
        label: 'Blood Oxygen',
        unit: '%',
        color: C.cyan,
    },
    {
        key: 'temperature',
        label: 'Temperature',
        unit: '°C',
        color: C.yellow,
    },
    {
        key: 'sleep',
        label: 'Sleep',
        unit: 'h',
        color: C.purple,
    },
    {
        key: 'respiration',
        label: 'Respiration',
        unit: '/min',
        color: C.green,
    },
];

const FORECAST_OPTIONS = {
    horizonSteps: 5,
    sampleIntervalMinutes: 0.075,
    maxSamples: 30,
};

function metricIcon(
    metric: HealthMetric,
    color: string,
    size: number = 18
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
    if (trend === 'increasing') {
        return <TrendingUp color={color} size={16} />;
    }

    if (trend === 'decreasing') {
        return <TrendingDown color={color} size={16} />;
    }

    return <Minus color={color} size={16} />;
}

function formatValue(
    value: number | null,
    metric: HealthMetric
): string {
    if (value === null || !Number.isFinite(value)) {
        return '--';
    }

    if (metric === 'temperature' || metric === 'sleep') {
        return value.toFixed(1);
    }

    return String(Math.round(value));
}

function hasForecast(
    prediction: CrewPrediction
): boolean {
    return (
        prediction.sampleCount >= 3 &&
        prediction.predictedHealthScore !== null
    );
}

function CrewOverviewCard({
                              prediction,
                              onSelect,
                          }: {
    prediction: CrewPrediction;
    onSelect: (id: string) => void;
}) {
    const member =
        CREW.find(item => item.id === prediction.crewId) ??
        CREW[0];

    const ready = hasForecast(prediction);

    const riskColor = ready
        ? getPredictionRiskColor(prediction.overallRisk)
        : C.muted;

    const riskLabel = ready
        ? getPredictionRiskLabel(prediction.overallRisk)
        : 'Awaiting Data';

    const flaggedMetrics = prediction.metrics.filter(
        metric =>
            metric.predictedValue !== null &&
            metric.risk !== 'low'
    ).length;

    const score =
        prediction.predictedHealthScore;

    return (
        <TouchableOpacity
            style={styles.crewCard}
            onPress={() => onSelect(prediction.crewId)}
            activeOpacity={0.8}
        >
            <View style={styles.crewCardTop}>
                <View
                    style={[
                        styles.crewAvatar,
                        { backgroundColor: member.color + '20' },
                    ]}
                >
                    <Text
                        style={[
                            styles.crewInitials,
                            { color: member.color },
                        ]}
                    >
                        {member.initials}
                    </Text>
                </View>

                <View style={styles.crewIdentity}>
                    <Text style={styles.crewName}>
                        {member.name}
                    </Text>

                    <Text style={styles.crewRole}>
                        {member.role} · {member.id}
                    </Text>
                </View>

                <ChevronRight color={C.muted} size={20} />
            </View>

            <View style={styles.crewCardDivider} />

            <View style={styles.crewCardStats}>
                <View>
                    <Text style={styles.eyebrow}>
                        PROJECTED SCORE
                    </Text>

                    <Text
                        style={[
                            styles.crewScore,
                            { color: ready ? member.color : C.muted },
                        ]}
                    >
                        {score !== null ? score : '--'}
                        <Text style={styles.scoreMax}>/100</Text>
                    </Text>
                </View>

                <View style={styles.crewRiskColumn}>
                    <Text style={styles.eyebrow}>
                        PROJECTED RISK
                    </Text>

                    <View
                        style={[
                            styles.riskPill,
                            { backgroundColor: riskColor + '18' },
                        ]}
                    >
                        <Text
                            style={[
                                styles.riskPillText,
                                { color: riskColor },
                            ]}
                        >
                            {riskLabel}
                        </Text>
                    </View>
                </View>
            </View>

            <View style={styles.crewCardBottom}>
                <Text style={styles.crewCardMeta}>
                    {prediction.sampleCount} saved samples
                </Text>

                <Text style={styles.crewCardMeta}>
                    {ready
                        ? `${flaggedMetrics} projected metric flags`
                        : 'Collecting forecast data'}
                </Text>
            </View>
        </TouchableOpacity>
    );
}

function MetricComparisonRow({
                                 metric,
                                 predictions,
                             }: {
    metric: (typeof METRICS)[number];
    predictions: CrewPrediction[];
}) {
    return (
        <View style={styles.comparisonCard}>
            <View style={styles.comparisonHeader}>
                <View
                    style={[
                        styles.metricIcon,
                        { backgroundColor: metric.color + '18' },
                    ]}
                >
                    {metricIcon(metric.key, metric.color, 20)}
                </View>

                <View>
                    <Text style={styles.comparisonTitle}>
                        {metric.label}
                    </Text>

                    <Text style={styles.comparisonSubtitle}>
                        Projected values · {metric.unit}
                    </Text>
                </View>
            </View>

            {predictions.map(prediction => {
                const member =
                    CREW.find(
                        item => item.id === prediction.crewId
                    ) ?? CREW[0];

                const result = prediction.metrics.find(
                    item => item.metric === metric.key
                );

                const ready =
                    result?.predictedValue !== null &&
                    result?.predictedValue !== undefined;

                const riskColor = ready && result
                    ? getPredictionRiskColor(result.risk)
                    : C.muted;

                return (
                    <View
                        key={prediction.crewId}
                        style={styles.comparisonRow}
                    >
                        <View
                            style={[
                                styles.comparisonDot,
                                { backgroundColor: member.color },
                            ]}
                        />

                        <Text style={styles.comparisonCrew}>
                            {member.initials}
                        </Text>

                        <View style={styles.comparisonValues}>
                            <Text style={styles.comparisonCurrent}>
                                {result
                                    ? formatValue(
                                        result.currentValue,
                                        metric.key
                                    )
                                    : '--'}
                            </Text>

                            <ArrowRight
                                color={C.muted}
                                size={15}
                            />

                            <Text
                                style={[
                                    styles.comparisonProjected,
                                    { color: metric.color },
                                ]}
                            >
                                {result
                                    ? formatValue(
                                        result.predictedValue,
                                        metric.key
                                    )
                                    : '--'}
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.comparisonRisk,
                                { backgroundColor: riskColor + '18' },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.comparisonRiskText,
                                    { color: riskColor },
                                ]}
                            >
                                {ready && result
                                    ? getPredictionRiskLabel(result.risk)
                                    : 'Pending'}
                            </Text>
                        </View>
                    </View>
                );
            })}
        </View>
    );
}

function CrewDetails({
                         prediction,
                         onOpenAnalysis,
                         onOpenHistory,
                     }: {
    prediction: CrewPrediction;
    onOpenAnalysis: () => void;
    onOpenHistory: () => void;
}) {
    const member =
        CREW.find(item => item.id === prediction.crewId) ??
        CREW[0];

    const ready = hasForecast(prediction);

    const riskColor = ready
        ? getPredictionRiskColor(prediction.overallRisk)
        : C.muted;

    return (
        <View style={styles.detailsCard}>
            <View style={styles.detailsHeader}>
                <View>
                    <Text style={styles.detailsEyebrow}>
                        SELECTED ASTRONAUT
                    </Text>

                    <Text style={styles.detailsName}>
                        {member.name}
                    </Text>

                    <Text style={styles.detailsRole}>
                        {member.role}
                    </Text>
                </View>

                <View
                    style={[
                        styles.detailsAvatar,
                        { backgroundColor: member.color + '20' },
                    ]}
                >
                    <Text
                        style={[
                            styles.detailsInitials,
                            { color: member.color },
                        ]}
                    >
                        {member.initials}
                    </Text>
                </View>
            </View>

            <View style={styles.detailsStats}>
                <View>
                    <Text style={styles.eyebrow}>
                        CURRENT SCORE
                    </Text>

                    <Text style={styles.detailsScore}>
                        {prediction.currentHealthScore ?? '--'}
                    </Text>
                </View>

                <ArrowRight color={C.purple} size={23} />

                <View>
                    <Text style={styles.eyebrow}>
                        PROJECTED SCORE
                    </Text>

                    <Text
                        style={[
                            styles.detailsScore,
                            { color: C.purple },
                        ]}
                    >
                        {prediction.predictedHealthScore ?? '--'}
                    </Text>
                </View>
            </View>

            <View
                style={[
                    styles.detailsRisk,
                    { backgroundColor: riskColor + '18' },
                ]}
            >
                {ready && prediction.overallRisk !== 'low' ? (
                    <ShieldAlert color={riskColor} size={19} />
                ) : (
                    <ShieldCheck color={riskColor} size={19} />
                )}

                <Text
                    style={[
                        styles.detailsRiskText,
                        { color: riskColor },
                    ]}
                >
                    {ready
                        ? `${getPredictionRiskLabel(
                            prediction.overallRisk
                        )} Projected Risk`
                        : 'Awaiting Forecast Data'}
                </Text>
            </View>

            <Text style={styles.detailsSectionTitle}>
                Biometric Forecasts
            </Text>

            {prediction.metrics.map(metric => {
                const config =
                    METRICS.find(
                        item => item.key === metric.metric
                    ) ?? METRICS[0];

                const metricReady =
                    metric.predictedValue !== null;

                const color = metricReady
                    ? getPredictionRiskColor(metric.risk)
                    : C.muted;

                return (
                    <View
                        key={metric.metric}
                        style={styles.detailsMetricRow}
                    >
                        <View
                            style={[
                                styles.detailsMetricIcon,
                                {
                                    backgroundColor:
                                        config.color + '18',
                                },
                            ]}
                        >
                            {metricIcon(
                                metric.metric,
                                config.color,
                                18
                            )}
                        </View>

                        <View style={styles.detailsMetricContent}>
                            <Text style={styles.detailsMetricName}>
                                {metric.label}
                            </Text>

                            <View style={styles.detailsTrend}>
                                {trendIcon(
                                    metric.trend,
                                    config.color
                                )}

                                <Text style={styles.detailsTrendText}>
                                    {getPredictionTrendLabel(metric.trend)}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.detailsMetricRight}>
                            <Text style={styles.detailsMetricValue}>
                                {formatValue(
                                    metric.predictedValue,
                                    metric.metric
                                )}
                                <Text style={styles.detailsMetricUnit}>
                                    {' '}{metric.unit}
                                </Text>
                            </Text>

                            <Text
                                style={[
                                    styles.detailsMetricRisk,
                                    { color },
                                ]}
                            >
                                {metricReady
                                    ? getPredictionRiskLabel(metric.risk)
                                    : 'Pending'}
                            </Text>
                        </View>
                    </View>
                );
            })}

            <Text style={styles.detailsSectionTitle}>
                Simulated Forecast Insights
            </Text>

            {prediction.insights.length > 0 ? (
                prediction.insights.slice(0, 4).map(
                    (insight, index) => (
                        <View
                            key={index}
                            style={styles.insightRow}
                        >
                            <Sparkles
                                color={C.purple}
                                size={17}
                            />

                            <Text style={styles.insightText}>
                                {insight}
                            </Text>
                        </View>
                    )
                )
            ) : (
                <Text style={styles.emptyInsight}>
                    More telemetry samples are needed
                    for meaningful trend explanations.
                </Text>
            )}

            {prediction.recommendations.length > 0 && (
                <>
                    <Text style={styles.detailsSectionTitle}>
                        Simulation Recommendations
                    </Text>

                    {prediction.recommendations
                        .slice(0, 3)
                        .map((recommendation, index) => (
                            <View
                                key={index}
                                style={styles.insightRow}
                            >
                                <CircleCheck
                                    color={C.green}
                                    size={17}
                                />

                                <Text style={styles.insightText}>
                                    {recommendation}
                                </Text>
                            </View>
                        ))}
                </>
            )}

            <TouchableOpacity
                style={styles.detailsPrimaryButton}
                onPress={onOpenAnalysis}
            >
                <BrainCircuit color={C.bg} size={19} />

                <Text style={styles.detailsPrimaryText}>
                    OPEN PREDICTIVE ANALYTICS
                </Text>

                <ArrowRight color={C.bg} size={18} />
            </TouchableOpacity>

            <TouchableOpacity
                style={styles.detailsSecondaryButton}
                onPress={onOpenHistory}
            >
                <Database color={C.cyan} size={19} />

                <Text style={styles.detailsSecondaryText}>
                    VIEW ASTRONAUT HISTORY
                </Text>
            </TouchableOpacity>
        </View>
    );
}

export default function MissionOverviewScreen() {
    const router = useRouter();

    const {
        history,
        historyLoaded,
        selectedId,
        setSelectedId,
        addSample,
        activeAlertCount,
        tick,
    } = useMissionHealth();

    const [expandedCrewId, setExpandedCrewId] =
        useState<string | null>(null);

    const [showAllMetrics, setShowAllMetrics] =
        useState(false);

    const missionPrediction = useMemo(
        () =>
            predictMissionHealth(
                CREW.map(member => member.id),
                history,
                FORECAST_OPTIONS
            ),
        [history]
    );

    const predictions = missionPrediction.crew;

    const selectedPrediction =
        predictions.find(
            item => item.crewId === expandedCrewId
        ) ?? null;

    const analyzedCrew =
        missionPrediction.analyzedCrewCount;

    const missionReady = analyzedCrew > 0;

    const missionRiskColor = missionReady
        ? getPredictionRiskColor(
            missionPrediction.overallRisk
        )
        : C.muted;

    const missionRiskLabel = missionReady
        ? getPredictionRiskLabel(
            missionPrediction.overallRisk
        )
        : 'Awaiting Data';

    const metricsToShow = showAllMetrics
        ? METRICS
        : METRICS.slice(0, 3);

    const flaggedCrewCount =
        missionPrediction.flaggedCrewIds.length;

    const selectCrew = (id: string) => {
        setSelectedId(id);
        setExpandedCrewId(current =>
            current === id ? null : id
        );
    };

    const openAnalysis = () =>
        router.push('/analysis');

    const openHistory = () =>
        router.push('/history');

    const openAlerts = () =>
        router.push('/alerts');

    const openCrew = () =>
        router.push('/crew');

    const openAI = () =>
        router.push('/aicare');

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
                        style={styles.headerButton}
                        onPress={() => router.replace('/')}
                    >
                        <ArrowLeft color={C.white} size={22} />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <Text style={styles.brand}>
                            ✦ COSMIC CARE
                        </Text>

                        <Text style={styles.headerSubtitle}>
                            MISSION PREDICTIVE INTELLIGENCE
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={openAnalysis}
                    >
                        <BrainCircuit
                            color={C.purple}
                            size={21}
                        />
                    </TouchableOpacity>
                </View>

                <LinearGradient
                    colors={[
                        '#27345C',
                        '#172D4B',
                        '#101D32',
                    ]}
                    style={styles.hero}
                >
                    <View style={styles.heroTop}>
                        <View style={styles.heroBadge}>
                            <Radio color={C.green} size={15} />

                            <Text style={styles.heroBadgeText}>
                                SIMULATION ACTIVE
                            </Text>
                        </View>

                        <Text style={styles.heroMission}>
                            MISSION CC-01
                        </Text>
                    </View>

                    <View style={styles.heroIcon}>
                        <BrainCircuit
                            color={C.purple}
                            size={34}
                        />
                    </View>

                    <Text style={styles.heroTitle}>
                        Mission Predictive Overview
                    </Text>

                    <Text style={styles.heroDescription}>
                        Compare projected health scores,
                        biometric trends, and simulated
                        future risks across the entire crew.
                    </Text>

                    <View style={styles.heroDivider} />

                    <View style={styles.heroStats}>
                        <View>
                            <Text style={styles.heroStatValue}>
                                {analyzedCrew}/4
                            </Text>

                            <Text style={styles.heroStatLabel}>
                                CREW ANALYZED
                            </Text>
                        </View>

                        <View>
                            <Text style={styles.heroStatValue}>
                                {flaggedCrewCount}
                            </Text>

                            <Text style={styles.heroStatLabel}>
                                RISK FLAGS
                            </Text>
                        </View>

                        <View>
                            <Text style={styles.heroStatValue}>
                                {history.length}
                            </Text>

                            <Text style={styles.heroStatLabel}>
                                SAVED SAMPLES
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Mission Forecast Status
                    </Text>

                    <ShieldCheck
                        color={missionRiskColor}
                        size={21}
                    />
                </View>

                <View style={styles.missionStatusCard}>
                    <View style={styles.missionStatusTop}>
                        <View>
                            <Text style={styles.eyebrow}>
                                OVERALL PROJECTED RISK
                            </Text>

                            <Text
                                style={[
                                    styles.missionRiskValue,
                                    { color: missionRiskColor },
                                ]}
                            >
                                {missionRiskLabel}
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.missionRiskIcon,
                                {
                                    backgroundColor:
                                        missionRiskColor + '18',
                                },
                            ]}
                        >
                            {missionReady &&
                            missionPrediction.overallRisk !== 'low' ? (
                                <ShieldAlert
                                    color={missionRiskColor}
                                    size={27}
                                />
                            ) : (
                                <ShieldCheck
                                    color={missionRiskColor}
                                    size={27}
                                />
                            )}
                        </View>
                    </View>

                    <Text style={styles.missionStatusText}>
                        {missionPrediction.summary}
                    </Text>

                    <View style={styles.missionStatusDivider} />

                    <View style={styles.missionScoreRow}>
                        <View>
                            <Text style={styles.eyebrow}>
                                AVERAGE PROJECTED SCORE
                            </Text>

                            <Text style={styles.missionAverageScore}>
                                {missionPrediction.averagePredictedScore !== null
                                    ? Math.round(
                                        missionPrediction.averagePredictedScore
                                    )
                                    : '--'}
                                <Text style={styles.scoreMax}>/100</Text>
                            </Text>
                        </View>

                        <View style={styles.missionScoreRight}>
                            <Text style={styles.eyebrow}>
                                CURRENT ALERTS
                            </Text>

                            <Text
                                style={[
                                    styles.missionAlertValue,
                                    {
                                        color:
                                            activeAlertCount > 0
                                                ? C.pink
                                                : C.green,
                                    },
                                ]}
                            >
                                {activeAlertCount}
                            </Text>
                        </View>
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Crew Risk Comparison
                    </Text>

                    <Users color={C.cyan} size={21} />
                </View>

                <Text style={styles.sectionDescription}>
                    Select any astronaut to inspect
                    projected health metrics and
                    forecast explanations.
                </Text>

                {predictions.map(prediction => (
                    <CrewOverviewCard
                        key={prediction.crewId}
                        prediction={prediction}
                        onSelect={selectCrew}
                    />
                ))}

                {selectedPrediction && (
                    <CrewDetails
                        prediction={selectedPrediction}
                        onOpenAnalysis={openAnalysis}
                        onOpenHistory={openHistory}
                    />
                )}

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Biometric Comparisons
                    </Text>

                    <BarChart3 color={C.purple} size={21} />
                </View>

                <Text style={styles.sectionDescription}>
                    Compare current and projected values
                    for all four astronauts.
                </Text>

                {metricsToShow.map(metric => (
                    <MetricComparisonRow
                        key={metric.key}
                        metric={metric}
                        predictions={predictions}
                    />
                ))}

                <TouchableOpacity
                    style={styles.showMoreButton}
                    onPress={() =>
                        setShowAllMetrics(value => !value)
                    }
                >
                    <Text style={styles.showMoreText}>
                        {showAllMetrics
                            ? 'SHOW FEWER METRICS'
                            : 'SHOW ALL FIVE METRICS'}
                    </Text>

                    <ChevronDown
                        color={C.cyan}
                        size={18}
                    />
                </TouchableOpacity>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Mission Forecast Insights
                    </Text>

                    <Sparkles color={C.purple} size={21} />
                </View>

                <View style={styles.insightsCard}>
                    <View style={styles.insightRow}>
                        <BrainCircuit
                            color={C.purple}
                            size={19}
                        />

                        <Text style={styles.insightText}>
                            {analyzedCrew} of 4 astronauts
                            have enough saved telemetry
                            samples for simulated prediction.
                        </Text>
                    </View>

                    <View style={styles.insightRow}>
                        <ShieldAlert
                            color={flaggedCrewCount > 0 ? C.yellow : C.green}
                            size={19}
                        />

                        <Text style={styles.insightText}>
                            {flaggedCrewCount} astronauts
                            have projected risk flags based
                            on illustrative biometric rules.
                        </Text>
                    </View>

                    <View style={styles.insightRow}>
                        <Clock3
                            color={C.cyan}
                            size={19}
                        />

                        <Text style={styles.insightText}>
                            Forecasts estimate five future
                            simulation samples from recent
                            stored telemetry trends.
                        </Text>
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Mission Actions
                    </Text>

                    <Activity color={C.cyan} size={21} />
                </View>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={openAnalysis}
                >
                    <BrainCircuit
                        color={C.purple}
                        size={22}
                    />

                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>
                            Predictive Analytics
                        </Text>

                        <Text style={styles.actionSubtitle}>
                            Explore detailed forecast charts
                        </Text>
                    </View>

                    <ChevronRight
                        color={C.purple}
                        size={20}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={openAlerts}
                >
                    <ShieldAlert
                        color={C.pink}
                        size={22}
                    />

                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>
                            Mission Alert Center
                        </Text>

                        <Text style={styles.actionSubtitle}>
                            Review current and projected alerts
                        </Text>
                    </View>

                    <ChevronRight
                        color={C.pink}
                        size={20}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={openCrew}
                >
                    <Users
                        color={C.green}
                        size={22}
                    />

                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>
                            Crew Health Dashboard
                        </Text>

                        <Text style={styles.actionSubtitle}>
                            Inspect astronaut health profiles
                        </Text>
                    </View>

                    <ChevronRight
                        color={C.green}
                        size={20}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={openHistory}
                >
                    <Database
                        color={C.yellow}
                        size={22}
                    />

                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>
                            Mission History
                        </Text>

                        <Text style={styles.actionSubtitle}>
                            Explore saved telemetry records
                        </Text>
                    </View>

                    <ChevronRight
                        color={C.yellow}
                        size={20}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={openAI}
                >
                    <Sparkles
                        color={C.cyan}
                        size={22}
                    />

                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>
                            AI Care Assistant
                        </Text>

                        <Text style={styles.actionSubtitle}>
                            Review simulated recommendations
                        </Text>
                    </View>

                    <ChevronRight
                        color={C.cyan}
                        size={20}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.sampleButton}
                    onPress={addSample}
                >
                    <Radio color={C.cyan} size={19} />

                    <Text style={styles.sampleButtonText}>
                        Generate Mission Telemetry Sample
                    </Text>
                </TouchableOpacity>

                <View style={styles.storageStatus}>
                    <Database color={C.green} size={17} />

                    <Text style={styles.storageStatusText}>
                        {historyLoaded
                            ? `${history.length} saved records · Tick ${tick}`
                            : 'Loading mission telemetry...'}
                    </Text>
                </View>

                <View style={styles.disclaimer}>
                    <Info color={C.cyan} size={21} />

                    <Text style={styles.disclaimerText}>
                        Educational simulation only.
                        Cosmic Care uses fictional
                        astronaut telemetry and simple
                        mathematical extrapolation.
                        Projected scores, risk categories,
                        and recommendations are not
                        medically validated and must not
                        be used for real clinical decisions.
                    </Text>
                </View>

                <Text style={styles.footer}>
                    COSMIC CARE · MISSION CC-01
                    {'\n'}
                    MISSION PREDICTIVE INTELLIGENCE
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
        marginBottom: 23,
    },
    headerButton: {
        width: 44,
        height: 44,
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
        fontSize: 16,
        fontWeight: '900',
        letterSpacing: 1,
    },
    headerSubtitle: {
        color: C.muted,
        fontSize: 9,
        letterSpacing: 1,
        marginTop: 5,
    },
    hero: {
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#45578B',
        padding: 20,
        marginBottom: 25,
    },
    heroTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    heroBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: '#194344',
        borderRadius: 20,
        paddingHorizontal: 11,
        paddingVertical: 8,
    },
    heroBadgeText: {
        color: C.green,
        fontSize: 9,
        fontWeight: '900',
    },
    heroMission: {
        color: C.purple,
        fontSize: 10,
        fontWeight: '900',
    },
    heroIcon: {
        width: 70,
        height: 70,
        borderRadius: 20,
        backgroundColor: '#38375D',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 25,
        marginBottom: 18,
    },
    heroTitle: {
        color: C.white,
        fontSize: 26,
        fontWeight: '900',
    },
    heroDescription: {
        color: '#D2D0EA',
        fontSize: 12,
        lineHeight: 21,
        marginTop: 11,
    },
    heroDivider: {
        height: 1,
        backgroundColor: '#45578B',
        marginVertical: 21,
    },
    heroStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    heroStatValue: {
        color: C.white,
        fontSize: 22,
        fontWeight: '900',
    },
    heroStatLabel: {
        color: C.muted,
        fontSize: 9,
        marginTop: 7,
    },
    sectionHeader: {
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
    sectionDescription: {
        color: C.muted,
        fontSize: 12,
        lineHeight: 20,
        marginBottom: 15,
    },
    eyebrow: {
        color: C.muted,
        fontSize: 10,
        fontWeight: '800',
    },
    missionStatusCard: {
        backgroundColor: C.card,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 17,
        padding: 18,
        marginBottom: 24,
    },
    missionStatusTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    missionRiskValue: {
        fontSize: 24,
        fontWeight: '900',
        marginTop: 10,
    },
    missionRiskIcon: {
        width: 50,
        height: 50,
        borderRadius: 14,
        alignItems: 'center',
        justifyContent: 'center',
    },
    missionStatusText: {
        color: '#B8C8DB',
        fontSize: 12,
        lineHeight: 20,
        marginTop: 16,
    },
    missionStatusDivider: {
        height: 1,
        backgroundColor: C.border,
        marginVertical: 20,
    },
    missionScoreRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    missionAverageScore: {
        color: C.purple,
        fontSize: 29,
        fontWeight: '900',
        marginTop: 7,
    },
    scoreMax: {
        color: C.muted,
        fontSize: 12,
    },
    missionScoreRight: {
        alignItems: 'flex-end',
    },
    missionAlertValue: {
        fontSize: 29,
        fontWeight: '900',
        marginTop: 7,
    },
    crewCard: {
        backgroundColor: C.card,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    crewCardTop: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    crewAvatar: {
        width: 45,
        height: 45,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    crewInitials: {
        fontSize: 14,
        fontWeight: '900',
    },
    crewIdentity: {
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
        marginTop: 6,
    },
    crewCardDivider: {
        height: 1,
        backgroundColor: C.border,
        marginVertical: 17,
    },
    crewCardStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    crewScore: {
        fontSize: 27,
        fontWeight: '900',
        marginTop: 8,
    },
    crewRiskColumn: {
        alignItems: 'flex-end',
    },
    riskPill: {
        borderRadius: 10,
        paddingHorizontal: 11,
        paddingVertical: 8,
        marginTop: 9,
    },
    riskPillText: {
        fontSize: 10,
        fontWeight: '900',
    },
    crewCardBottom: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 18,
    },
    crewCardMeta: {
        color: C.muted,
        fontSize: 10,
    },
    comparisonCard: {
        backgroundColor: C.card,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 15,
        marginBottom: 12,
    },
    comparisonHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginBottom: 11,
    },
    metricIcon: {
        width: 43,
        height: 43,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    comparisonTitle: {
        color: C.white,
        fontSize: 13,
        fontWeight: '900',
    },
    comparisonSubtitle: {
        color: C.muted,
        fontSize: 10,
        marginTop: 5,
    },
    comparisonRow: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: C.border,
        paddingVertical: 12,
    },
    comparisonDot: {
        width: 9,
        height: 9,
        borderRadius: 5,
        marginRight: 9,
    },
    comparisonCrew: {
        color: C.white,
        fontSize: 11,
        fontWeight: '900',
        width: 31,
    },
    comparisonValues: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 9,
    },
    comparisonCurrent: {
        color: C.muted,
        fontSize: 12,
        fontWeight: '800',
    },
    comparisonProjected: {
        fontSize: 13,
        fontWeight: '900',
    },
    comparisonRisk: {
        borderRadius: 8,
        paddingHorizontal: 9,
        paddingVertical: 7,
    },
    comparisonRiskText: {
        fontSize: 9,
        fontWeight: '900',
    },
    showMoreButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 9,
        backgroundColor: '#15384B',
        borderRadius: 12,
        paddingVertical: 15,
        marginBottom: 24,
    },
    showMoreText: {
        color: C.cyan,
        fontSize: 11,
        fontWeight: '900',
    },
    detailsCard: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: '#514979',
        borderRadius: 17,
        padding: 17,
        marginBottom: 25,
    },
    detailsHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    detailsEyebrow: {
        color: C.purple,
        fontSize: 10,
        fontWeight: '900',
    },
    detailsName: {
        color: C.white,
        fontSize: 20,
        fontWeight: '900',
        marginTop: 8,
    },
    detailsRole: {
        color: C.muted,
        fontSize: 11,
        marginTop: 6,
    },
    detailsAvatar: {
        width: 52,
        height: 52,
        borderRadius: 15,
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailsInitials: {
        fontSize: 17,
        fontWeight: '900',
    },
    detailsStats: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginTop: 25,
    },
    detailsScore: {
        color: C.white,
        fontSize: 28,
        fontWeight: '900',
        marginTop: 8,
    },
    detailsRisk: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        borderRadius: 12,
        padding: 13,
        marginTop: 21,
    },
    detailsRiskText: {
        fontSize: 12,
        fontWeight: '900',
    },
    detailsSectionTitle: {
        color: C.white,
        fontSize: 15,
        fontWeight: '900',
        marginTop: 26,
        marginBottom: 15,
    },
    detailsMetricRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    detailsMetricIcon: {
        width: 39,
        height: 39,
        borderRadius: 11,
        alignItems: 'center',
        justifyContent: 'center',
    },
    detailsMetricContent: {
        flex: 1,
        marginLeft: 11,
    },
    detailsMetricName: {
        color: C.white,
        fontSize: 12,
        fontWeight: '900',
    },
    detailsTrend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 7,
    },
    detailsTrendText: {
        color: C.muted,
        fontSize: 10,
    },
    detailsMetricRight: {
        alignItems: 'flex-end',
    },
    detailsMetricValue: {
        color: C.white,
        fontSize: 16,
        fontWeight: '900',
    },
    detailsMetricUnit: {
        color: C.muted,
        fontSize: 10,
    },
    detailsMetricRisk: {
        fontSize: 10,
        fontWeight: '800',
        marginTop: 6,
    },
    insightRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 11,
        paddingVertical: 12,
    },
    insightText: {
        flex: 1,
        color: '#B8C8DB',
        fontSize: 11,
        lineHeight: 19,
    },
    emptyInsight: {
        color: C.muted,
        fontSize: 11,
        lineHeight: 19,
    },
    detailsPrimaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: C.purple,
        borderRadius: 12,
        paddingVertical: 15,
        marginTop: 24,
    },
    detailsPrimaryText: {
        color: C.bg,
        fontSize: 11,
        fontWeight: '900',
    },
    detailsSecondaryButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#15384B',
        borderRadius: 12,
        paddingVertical: 15,
        marginTop: 10,
    },
    detailsSecondaryText: {
        color: C.cyan,
        fontSize: 11,
        fontWeight: '900',
    },
    insightsCard: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        padding: 16,
        marginBottom: 24,
    },
    actionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.card,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 15,
        padding: 16,
        marginBottom: 11,
    },
    actionContent: {
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
    sampleButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 10,
        backgroundColor: '#15384B',
        borderRadius: 13,
        paddingVertical: 16,
        marginTop: 12,
        marginBottom: 19,
    },
    sampleButtonText: {
        color: C.cyan,
        fontSize: 12,
        fontWeight: '900',
    },
    storageStatus: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        marginBottom: 20,
    },
    storageStatusText: {
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
