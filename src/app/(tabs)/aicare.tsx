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
    Bell,
    BrainCircuit,
    CheckCircle2,
    ChevronDown,
    ChevronRight,
    Clock3,
    Database,
    Heart,
    Info,
    Lightbulb,
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
    Zap,
} from 'lucide-react-native';

import {
    useMissionHealth,
} from '../../context/MissionHealthContext';

import {
    getSeverityColor,
    getSeverityLabel,
    type HealthAlert,
    type HealthMetric,
} from '../../services/healthAlertEngine';

import {
    predictCrewHealth,
    getPredictionRiskColor,
    getPredictionRiskLabel,
    getPredictionTrendLabel,
    type MetricPrediction,
    type PredictionRisk,
    type PredictionTrend,
} from '../../services/predictiveHealthEngine';

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

const FORECAST_OPTIONS = {
    horizonSteps: 5,
    sampleIntervalMinutes: 0.075,
    maxSamples: 30,
};

type RecommendationPriority = 'high' | 'medium' | 'low';

type Recommendation = {
    id: string;
    title: string;
    description: string;
    reason: string;
    priority: RecommendationPriority;
    metric: HealthMetric | null;
    source: 'current' | 'forecast' | 'general';
};

function formatMetric(
    value: number | null,
    metric: HealthMetric
): string {
    if (value === null) {
        return '--';
    }

    if (metric === 'temperature' || metric === 'sleep') {
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
    if (trend === 'increasing') {
        return <TrendingUp color={color} size={17} />;
    }

    if (trend === 'decreasing') {
        return <TrendingDown color={color} size={17} />;
    }

    return <Minus color={color} size={17} />;
}

function priorityColor(
    priority: RecommendationPriority
): string {
    switch (priority) {
        case 'high':
            return C.pink;
        case 'medium':
            return C.yellow;
        case 'low':
            return C.green;
    }
}

function buildRecommendations(
    alerts: HealthAlert[],
    metrics: MetricPrediction[],
    sampleCount: number
): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const currentAlertMetrics = new Set<HealthMetric>();

    for (const alert of alerts) {
        currentAlertMetrics.add(alert.metric);

        recommendations.push({
            id: `current-${alert.id}`,
            title: alert.title,
            description: alert.recommendation,
            reason: alert.message,
            priority:
                alert.severity === 'critical' ||
                alert.severity === 'warning'
                    ? 'high'
                    : 'medium',
            metric: alert.metric,
            source: 'current',
        });
    }

    if (sampleCount >= 3) {
        for (const metric of metrics) {
            if (
                metric.predictedValue === null ||
                currentAlertMetrics.has(metric.metric)
            ) {
                continue;
            }

            if (
                metric.risk === 'low' ||
                metric.trend === 'stable' ||
                metric.trend === 'insufficient_data'
            ) {
                continue;
            }

            const direction =
                getPredictionTrendLabel(metric.trend).toLowerCase();

            const riskLabel =
                getPredictionRiskLabel(metric.risk);

            recommendations.push({
                id: `forecast-${metric.metric}`,
                title: `${metric.label} Forecast Review`,
                description:
                    `Review the simulated ${metric.label.toLowerCase()} ` +
                    `trend in Predictive Analytics and compare it ` +
                    `with additional saved samples.`,
                reason:
                    `${metric.label} is projected to be ${direction}. ` +
                    `The illustrative forecast risk is ${riskLabel}. ` +
                    metric.explanation,
                priority:
                    metric.risk === 'high' ||
                    metric.risk === 'critical'
                        ? 'high'
                        : 'medium',
                metric: metric.metric,
                source: 'forecast',
            });
        }
    }

    if (sampleCount < 3) {
        recommendations.push({
            id: 'collect-telemetry',
            title: 'Collect More Telemetry',
            description:
                'Allow the simulation to generate at least three ' +
                'saved readings for this astronaut before ' +
                'interpreting projected trends.',
            reason:
                'There is not yet enough stored data to create ' +
                'the demonstration forecast.',
            priority: 'medium',
            metric: null,
            source: 'general',
        });
    }

    if (alerts.length === 0) {
        recommendations.push({
            id: 'routine-monitoring',
            title: 'Continue Routine Monitoring',
            description:
                'Continue collecting simulated biometric samples ' +
                'and reviewing changes in the Crew and Vitals dashboards.',
            reason:
                'No current rule-based health alerts were detected ' +
                'for the selected fictional astronaut.',
            priority: 'low',
            metric: null,
            source: 'general',
        });
    }

    recommendations.push({
        id: 'review-history',
        title: 'Review Historical Context',
        description:
            'Compare the latest readings against previous ' +
            'simulated records before drawing conclusions.',
        reason:
            'Short-term mathematical forecasts can change ' +
            'substantially when new samples are recorded.',
        priority: 'low',
        metric: null,
        source: 'general',
    });

    const priorityOrder: Record<
        RecommendationPriority,
        number
    > = {
        high: 0,
        medium: 1,
        low: 2,
    };

    return recommendations.sort(
        (a, b) =>
            priorityOrder[a.priority] -
            priorityOrder[b.priority]
    );
}

function RecommendationCard({
                                recommendation,
                            }: {
    recommendation: Recommendation;
}) {
    const color = priorityColor(
        recommendation.priority
    );

    return (
        <View style={styles.recommendationCard}>
            <View style={styles.recommendationHeader}>
                <View
                    style={[
                        styles.recommendationIcon,
                        { backgroundColor: color + '18' },
                    ]}
                >
                    {recommendation.metric ? (
                        metricIcon(
                            recommendation.metric,
                            color,
                            21
                        )
                    ) : (
                        <Lightbulb color={color} size={21} />
                    )}
                </View>

                <View style={styles.recommendationIdentity}>
                    <Text style={styles.recommendationTitle}>
                        {recommendation.title}
                    </Text>

                    <Text style={styles.recommendationSource}>
                        {recommendation.source === 'current'
                            ? 'CURRENT HEALTH RULE'
                            : recommendation.source === 'forecast'
                                ? 'SIMULATED FORECAST'
                                : 'MISSION GUIDANCE'}
                    </Text>
                </View>

                <View
                    style={[
                        styles.priorityBadge,
                        { backgroundColor: color + '18' },
                    ]}
                >
                    <Text
                        style={[
                            styles.priorityText,
                            { color },
                        ]}
                    >
                        {recommendation.priority.toUpperCase()}
                    </Text>
                </View>
            </View>

            <Text style={styles.recommendationDescription}>
                {recommendation.description}
            </Text>

            <View style={styles.reasonBox}>
                <Info color={C.muted} size={16} />

                <Text style={styles.reasonText}>
                    {recommendation.reason}
                </Text>
            </View>
        </View>
    );
}

function ForecastRow({
                         metric,
                     }: {
    metric: MetricPrediction;
}) {
    const color = METRIC_COLORS[metric.metric];

    const riskColor =
        metric.predictedValue === null
            ? C.muted
            : getPredictionRiskColor(metric.risk);

    return (
        <View style={styles.forecastRow}>
            <View
                style={[
                    styles.forecastMetricIcon,
                    { backgroundColor: color + '18' },
                ]}
            >
                {metricIcon(metric.metric, color, 19)}
            </View>

            <View style={styles.forecastMetricDetails}>
                <Text style={styles.forecastMetricName}>
                    {metric.label}
                </Text>

                <View style={styles.forecastTrend}>
                    {trendIcon(metric.trend, color)}

                    <Text
                        style={[
                            styles.forecastTrendText,
                            { color },
                        ]}
                    >
                        {getPredictionTrendLabel(
                            metric.trend
                        )}
                    </Text>
                </View>
            </View>

            <View style={styles.forecastMetricRight}>
                <Text style={styles.forecastValues}>
                    {formatMetric(
                        metric.currentValue,
                        metric.metric
                    )}
                    {' → '}
                    <Text style={{ color: C.purple }}>
                        {formatMetric(
                            metric.predictedValue,
                            metric.metric
                        )}
                    </Text>
                </Text>

                <Text
                    style={[
                        styles.forecastRisk,
                        { color: riskColor },
                    ]}
                >
                    {metric.predictedValue === null
                        ? 'Awaiting Data'
                        : getPredictionRiskLabel(metric.risk)}
                </Text>
            </View>
        </View>
    );
}

export default function AICareScreen() {
    const router = useRouter();

    const {
        selectedId,
        setSelectedId,
        selectedCrewAssessment,
        crewReadings,
        history,
        historyLoaded,
        tick,
        addSample,
        activeAlertCount,
    } = useMissionHealth();

    const [crewMenuOpen, setCrewMenuOpen] =
        useState(false);

    const [showAllRecommendations, setShowAllRecommendations] =
        useState(false);

    const [showExplanations, setShowExplanations] =
        useState(true);

    const selectedCrew =
        CREW.find(member => member.id === selectedId) ??
        CREW[0];

    const readings = crewReadings(selectedId);

    const prediction = useMemo(
        () =>
            predictCrewHealth(
                selectedId,
                history,
                FORECAST_OPTIONS
            ),
        [selectedId, history]
    );

    const hasForecast =
        prediction.sampleCount >= 3 &&
        prediction.predictedHealthScore !== null;

    const riskColor = hasForecast
        ? getPredictionRiskColor(
            prediction.overallRisk
        )
        : C.muted;

    const riskLabel = hasForecast
        ? getPredictionRiskLabel(
            prediction.overallRisk
        )
        : 'Awaiting Data';

    const recommendations = useMemo(
        () =>
            buildRecommendations(
                selectedCrewAssessment.alerts,
                prediction.metrics,
                prediction.sampleCount
            ),
        [
            selectedCrewAssessment.alerts,
            prediction.metrics,
            prediction.sampleCount,
        ]
    );

    const visibleRecommendations =
        showAllRecommendations
            ? recommendations
            : recommendations.slice(0, 3);

    const currentScore =
        selectedCrewAssessment.score;

    const projectedScore =
        prediction.predictedHealthScore;

    const scoreDifference =
        hasForecast && projectedScore !== null
            ? projectedScore - currentScore
            : null;

    const highPriorityCount =
        recommendations.filter(
            item => item.priority === 'high'
        ).length;

    const selectedHistoryCount =
        history.filter(
            record => record.crewId === selectedId
        ).length;

    const openAnalysis = () =>
        router.push('/analysis');

    const openVitals = () =>
        router.push('/vitals');

    const openCrew = () =>
        router.push('/crew');

    const openAlerts = () =>
        router.push('/alerts');

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
                <TouchableOpacity
                    onPress={() => router.push('/aichat')}
                    style={{
                        backgroundColor: '#17384D', borderColor: '#67E8F9',
                        borderWidth: 1, borderRadius: 16, padding: 20,
                        marginBottom: 20,
                    }}
                    accessibilityRole="button"
                    accessibilityLabel="Open NASA Research Q and A"
                >
                    <Text style={{ color: '#67E8F9', fontWeight: '900', fontSize: 16 }}>
                        ✦ NASA RESEARCH Q&A
                    </Text>
                    <Text style={{ color: '#B8C8DB', marginTop: 8, lineHeight: 20 }}>
                        Explore six selected NASA research questions about astronaut health and spaceflight.
                    </Text>
                    <Text style={{ color: '#67E8F9', marginTop: 14, fontWeight: '800' }}>
                        OPEN RESEARCH ASSISTANT →
                    </Text>
                </TouchableOpacity>

                <View style={styles.header}>
                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => router.replace('/')}
                    >
                        <ArrowLeft
                            color={C.white}
                            size={22}
                        />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <Text style={styles.brand}>
                            ✦ COSMIC CARE
                        </Text>

                        <Text style={styles.headerSubtitle}>
                            PREDICTIVE AI CARE
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={openAlerts}
                    >
                        <Bell
                            color={C.cyan}
                            size={22}
                        />

                        {activeAlertCount > 0 && (
                            <View style={styles.notificationDot} />
                        )}
                    </TouchableOpacity>
                </View>

                <LinearGradient
                    colors={[
                        '#302657',
                        '#192D4B',
                        '#101D32',
                    ]}
                    style={styles.hero}
                >
                    <View style={styles.heroTop}>
                        <View style={styles.simulationBadge}>
                            <Sparkles
                                color={C.purple}
                                size={15}
                            />

                            <Text style={styles.simulationText}>
                                RULE-BASED INTELLIGENCE
                            </Text>
                        </View>

                        <Text style={styles.missionId}>
                            CC-01
                        </Text>
                    </View>

                    <View style={styles.heroIcon}>
                        <BrainCircuit
                            color={C.purple}
                            size={35}
                        />
                    </View>

                    <Text style={styles.heroTitle}>
                        AI Care Assistant
                    </Text>

                    <Text style={styles.heroDescription}>
                        Explore fictional astronaut health
                        assessments, simulated trend
                        predictions, and explainable
                        rule-based recommendations.
                    </Text>

                    <View style={styles.heroDivider} />

                    <View style={styles.heroStats}>
                        <View>
                            <Text style={styles.heroStatValue}>
                                {prediction.sampleCount}
                            </Text>

                            <Text style={styles.heroStatLabel}>
                                ANALYZED SAMPLES
                            </Text>
                        </View>

                        <View>
                            <Text style={styles.heroStatValue}>
                                {selectedCrewAssessment.alerts.length}
                            </Text>

                            <Text style={styles.heroStatLabel}>
                                CURRENT ALERTS
                            </Text>
                        </View>

                        <View>
                            <Text style={styles.heroStatValue}>
                                {highPriorityCount}
                            </Text>

                            <Text style={styles.heroStatLabel}>
                                HIGH PRIORITY
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Select Astronaut
                    </Text>

                    <Users
                        color={C.muted}
                        size={20}
                    />
                </View>

                <TouchableOpacity
                    style={styles.crewPicker}
                    onPress={() =>
                        setCrewMenuOpen(value => !value)
                    }
                >
                    <View style={styles.crewAvatar}>
                        <Text style={styles.crewInitials}>
                            {selectedCrew.initials}
                        </Text>
                    </View>

                    <View style={styles.crewDetails}>
                        <Text style={styles.crewName}>
                            {selectedCrew.name}
                        </Text>

                        <Text style={styles.crewRole}>
                            {selectedCrew.role}
                            {' · '}
                            {selectedCrew.id}
                        </Text>
                    </View>

                    <ChevronDown
                        color={C.cyan}
                        size={21}
                    />
                </TouchableOpacity>

                {crewMenuOpen && (
                    <View style={styles.crewMenu}>
                        {CREW.map(member => (
                            <TouchableOpacity
                                key={member.id}
                                style={styles.crewOption}
                                onPress={() => {
                                    setSelectedId(member.id);
                                    setCrewMenuOpen(false);
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

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Health Intelligence
                    </Text>

                    <ShieldCheck
                        color={getSeverityColor(
                            selectedCrewAssessment.severity
                        )}
                        size={21}
                    />
                </View>

                <View style={styles.healthCard}>
                    <View style={styles.healthCardHeader}>
                        <View>
                            <Text style={styles.cardEyebrow}>
                                CURRENT HEALTH SCORE
                            </Text>

                            <Text style={styles.healthScore}>
                                {currentScore}
                                <Text style={styles.scoreMaximum}>
                                    /100
                                </Text>
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.healthStatusBadge,
                                {
                                    backgroundColor:
                                        getSeverityColor(
                                            selectedCrewAssessment.severity
                                        ) + '18',
                                },
                            ]}
                        >
                            <Text
                                style={[
                                    styles.healthStatusText,
                                    {
                                        color: getSeverityColor(
                                            selectedCrewAssessment.severity
                                        ),
                                    },
                                ]}
                            >
                                {getSeverityLabel(
                                    selectedCrewAssessment.severity
                                )}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.healthScoreTrack}>
                        <View
                            style={[
                                styles.healthScoreFill,
                                {
                                    width: `${Math.max(
                                        0,
                                        Math.min(100, currentScore)
                                    )}%` as `${number}%`,
                                    backgroundColor:
                                        getSeverityColor(
                                            selectedCrewAssessment.severity
                                        ),
                                },
                            ]}
                        />
                    </View>

                    <Text style={styles.healthSummary}>
                        {selectedCrewAssessment.summary}
                    </Text>

                    <View style={styles.healthFooter}>
                        <Text style={styles.healthFooterText}>
                            Heart: {readings.heart} BPM
                        </Text>

                        <Text style={styles.healthFooterText}>
                            Oxygen: {readings.oxygen}%
                        </Text>

                        <Text style={styles.healthFooterText}>
                            Sleep: {readings.sleep.toFixed(1)} h
                        </Text>
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Predictive Assessment
                    </Text>

                    <Sparkles
                        color={C.purple}
                        size={21}
                    />
                </View>

                <LinearGradient
                    colors={[
                        '#28244C',
                        '#182B47',
                        '#101D32',
                    ]}
                    style={styles.predictionCard}
                >
                    <View style={styles.predictionHeader}>
                        <View style={styles.predictionHeaderIcon}>
                            <BrainCircuit
                                color={C.purple}
                                size={25}
                            />
                        </View>

                        <View style={styles.predictionHeaderText}>
                            <Text style={styles.predictionTitle}>
                                Simulated Health Forecast
                            </Text>

                            <Text style={styles.predictionSubtitle}>
                                Five future simulation steps
                            </Text>
                        </View>
                    </View>

                    <View style={styles.predictionScores}>
                        <View style={styles.predictionScoreBlock}>
                            <Text style={styles.predictionScoreLabel}>
                                CURRENT
                            </Text>

                            <Text style={styles.predictionScoreValue}>
                                {currentScore}
                            </Text>
                        </View>

                        <ArrowRight
                            color={C.purple}
                            size={23}
                        />

                        <View style={styles.predictionScoreBlock}>
                            <Text style={styles.predictionScoreLabel}>
                                PROJECTED
                            </Text>

                            <Text
                                style={[
                                    styles.predictionScoreValue,
                                    { color: C.purple },
                                ]}
                            >
                                {hasForecast
                                    ? projectedScore
                                    : '--'}
                            </Text>
                        </View>
                    </View>

                    <View style={styles.predictionRiskRow}>
                        <View
                            style={[
                                styles.riskBadge,
                                { backgroundColor: riskColor + '18' },
                            ]}
                        >
                            <ShieldAlert
                                color={riskColor}
                                size={16}
                            />

                            <Text
                                style={[
                                    styles.riskBadgeText,
                                    { color: riskColor },
                                ]}
                            >
                                {riskLabel}
                            </Text>
                        </View>

                        <Text style={styles.predictionSampleCount}>
                            {prediction.sampleCount} samples
                        </Text>
                    </View>

                    {scoreDifference !== null && (
                        <View style={styles.scoreDifferenceRow}>
                            {scoreDifference < 0 ? (
                                <TrendingDown
                                    color={C.yellow}
                                    size={18}
                                />
                            ) : scoreDifference > 0 ? (
                                <TrendingUp
                                    color={C.green}
                                    size={18}
                                />
                            ) : (
                                <Minus
                                    color={C.cyan}
                                    size={18}
                                />
                            )}

                            <Text style={styles.scoreDifferenceText}>
                                {scoreDifference === 0
                                    ? 'Projected health score remains stable'
                                    : `Projected score ${
                                        scoreDifference > 0
                                            ? 'increases'
                                            : 'decreases'
                                    } by ${Math.abs(scoreDifference)} points`}
                            </Text>
                        </View>
                    )}

                    {!hasForecast && (
                        <Text style={styles.insufficientData}>
                            Collect at least three saved samples
                            for this astronaut to enable the
                            demonstration forecast.
                        </Text>
                    )}

                    <TouchableOpacity
                        style={styles.predictionButton}
                        onPress={openAnalysis}
                    >
                        <Text style={styles.predictionButtonText}>
                            EXPLORE PREDICTIVE ANALYTICS
                        </Text>

                        <ArrowRight
                            color={C.purple}
                            size={18}
                        />
                    </TouchableOpacity>
                </LinearGradient>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Biometric Forecasts
                    </Text>

                    <Activity
                        color={C.cyan}
                        size={20}
                    />
                </View>

                <View style={styles.forecastCard}>
                    {prediction.metrics.map(metric => (
                        <ForecastRow
                            key={`${selectedId}-${metric.metric}`}
                            metric={metric}
                        />
                    ))}
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Explainable Insights
                    </Text>

                    <TouchableOpacity
                        onPress={() =>
                            setShowExplanations(value => !value)
                        }
                    >
                        <Text style={styles.inlineLink}>
                            {showExplanations
                                ? 'Hide'
                                : 'Show'}
                        </Text>
                    </TouchableOpacity>
                </View>

                {showExplanations && (
                    <View style={styles.insightsCard}>
                        {prediction.insights.length > 0 ? (
                            prediction.insights.map(
                                (insight, index) => (
                                    <View
                                        key={`${selectedId}-${index}`}
                                        style={styles.insightRow}
                                    >
                                        <View style={styles.insightDot} />

                                        <Text style={styles.insightText}>
                                            {insight}
                                        </Text>
                                    </View>
                                )
                            )
                        ) : (
                            <Text style={styles.insightText}>
                                Additional saved samples are needed
                                before forecast explanations can
                                be generated.
                            </Text>
                        )}

                        <View style={styles.explanationDivider} />

                        <Text style={styles.explanationTitle}>
                            How these forecasts work
                        </Text>

                        <Text style={styles.explanationBody}>
                            Cosmic Care examines recent
                            simulated telemetry and extrapolates
                            numerical trends. It then compares
                            projected values against illustrative
                            thresholds to assign risk labels.
                            This is not a trained clinical AI
                            model or a medical diagnosis.
                        </Text>
                    </View>
                )}

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        AI Care Recommendations
                    </Text>

                    <Lightbulb
                        color={C.yellow}
                        size={20}
                    />
                </View>

                <Text style={styles.sectionDescription}>
                    These recommendations are generated
                    from current rule-based alerts and
                    fictional forecast trends.
                </Text>

                {visibleRecommendations.map(
                    recommendation => (
                        <RecommendationCard
                            key={recommendation.id}
                            recommendation={recommendation}
                        />
                    )
                )}

                {recommendations.length > 3 && (
                    <TouchableOpacity
                        style={styles.showMoreButton}
                        onPress={() =>
                            setShowAllRecommendations(
                                value => !value
                            )
                        }
                    >
                        <Text style={styles.showMoreText}>
                            {showAllRecommendations
                                ? 'Show Fewer Recommendations'
                                : `Show All ${recommendations.length} Recommendations`}
                        </Text>

                        <ChevronDown
                            color={C.cyan}
                            size={18}
                        />
                    </TouchableOpacity>
                )}

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Mission Data
                    </Text>

                    <Database
                        color={C.green}
                        size={20}
                    />
                </View>

                <View style={styles.dataCard}>
                    <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>
                            Selected astronaut
                        </Text>

                        <Text style={styles.dataValue}>
                            {selectedCrew.id}
                        </Text>
                    </View>

                    <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>
                            Saved crew records
                        </Text>

                        <Text style={styles.dataValue}>
                            {selectedHistoryCount}
                        </Text>
                    </View>

                    <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>
                            Forecast samples
                        </Text>

                        <Text style={styles.dataValue}>
                            {prediction.sampleCount}
                        </Text>
                    </View>

                    <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>
                            Simulation tick
                        </Text>

                        <Text style={styles.dataValue}>
                            {tick}
                        </Text>
                    </View>

                    <View style={styles.dataRow}>
                        <Text style={styles.dataLabel}>
                            Storage status
                        </Text>

                        <Text
                            style={[
                                styles.dataValue,
                                {
                                    color: historyLoaded
                                        ? C.green
                                        : C.yellow,
                                },
                            ]}
                        >
                            {historyLoaded
                                ? 'Ready'
                                : 'Loading'}
                        </Text>
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Mission Actions
                    </Text>

                    <Zap
                        color={C.yellow}
                        size={20}
                    />
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
                            Explore forecast charts and risk levels
                        </Text>
                    </View>

                    <ChevronRight
                        color={C.purple}
                        size={20}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={openCrew}
                >
                    <Users
                        color={C.cyan}
                        size={22}
                    />

                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>
                            Crew Health Dashboard
                        </Text>

                        <Text style={styles.actionSubtitle}>
                            Compare all four astronauts
                        </Text>
                    </View>

                    <ChevronRight
                        color={C.cyan}
                        size={20}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={openVitals}
                >
                    <Activity
                        color={C.pink}
                        size={22}
                    />

                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>
                            Live Vital Signs
                        </Text>

                        <Text style={styles.actionSubtitle}>
                            Inspect simulated biometric readings
                        </Text>
                    </View>

                    <ChevronRight
                        color={C.pink}
                        size={20}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={openAlerts}
                >
                    <Bell
                        color={C.yellow}
                        size={22}
                    />

                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>
                            Mission Alert Center
                        </Text>

                        <Text style={styles.actionSubtitle}>
                            Review current rule-based alerts
                        </Text>
                    </View>

                    <ChevronRight
                        color={C.yellow}
                        size={20}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionCard}
                    onPress={openHistory}
                >
                    <Database
                        color={C.green}
                        size={22}
                    />

                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>
                            Mission History
                        </Text>

                        <Text style={styles.actionSubtitle}>
                            View historical crew telemetry
                        </Text>
                    </View>

                    <ChevronRight
                        color={C.green}
                        size={20}
                    />
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.sampleButton}
                    onPress={addSample}
                >
                    <Radio
                        color={C.cyan}
                        size={19}
                    />

                    <Text style={styles.sampleButtonText}>
                        Generate Crew Telemetry Sample
                    </Text>
                </TouchableOpacity>

                <View style={styles.storageStatus}>
                    <Clock3
                        color={C.cyan}
                        size={17}
                    />

                    <Text style={styles.storageStatusText}>
                        {historyLoaded
                            ? `${history.length} saved telemetry records`
                            : 'Loading mission history...'}
                    </Text>
                </View>

                <View style={styles.disclaimer}>
                    <Info
                        color={C.cyan}
                        size={21}
                    />

                    <Text style={styles.disclaimerText}>
                        {prediction.disclaimer}
                        {'\n\n'}
                        Cosmic Care is an educational
                        astronaut health simulator.
                        Its recommendations, scores,
                        and predictions are fictional
                        and must not be used for medical
                        decisions or real mission operations.
                    </Text>
                </View>

                <Text style={styles.footer}>
                    COSMIC CARE · MISSION CC-01
                    {'\n'}
                    EXPLAINABLE MISSION INTELLIGENCE
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
    notificationDot: {
        position: 'absolute',
        right: 9,
        top: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: C.pink,
    },
    hero: {
        borderRadius: 22,
        borderWidth: 1,
        borderColor: '#514279',
        padding: 20,
        marginBottom: 25,
    },
    heroTop: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    simulationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 7,
        backgroundColor: '#352D60',
        borderRadius: 20,
        paddingHorizontal: 11,
        paddingVertical: 8,
    },
    simulationText: {
        color: C.purple,
        fontSize: 9,
        fontWeight: '900',
    },
    missionId: {
        color: C.purple,
        fontSize: 11,
        fontWeight: '900',
    },
    heroIcon: {
        width: 70,
        height: 70,
        borderRadius: 20,
        backgroundColor: '#352D60',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 25,
        marginBottom: 19,
    },
    heroTitle: {
        color: C.white,
        fontSize: 27,
        fontWeight: '900',
    },
    heroDescription: {
        color: '#C8C1E1',
        fontSize: 12,
        lineHeight: 21,
        marginTop: 11,
    },
    heroDivider: {
        height: 1,
        backgroundColor: '#51476B',
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
    inlineLink: {
        color: C.cyan,
        fontSize: 12,
        fontWeight: '800',
    },
    sectionDescription: {
        color: C.muted,
        fontSize: 12,
        lineHeight: 20,
        marginBottom: 15,
    },
    crewPicker: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.card,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 15,
        padding: 13,
        marginBottom: 20,
    },
    crewAvatar: {
        width: 45,
        height: 45,
        borderRadius: 13,
        backgroundColor: '#19485A',
        alignItems: 'center',
        justifyContent: 'center',
    },
    crewInitials: {
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
        backgroundColor: C.elevated,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 14,
        marginTop: -11,
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
    cardEyebrow: {
        color: C.muted,
        fontSize: 10,
        fontWeight: '700',
    },
    healthCard: {
        backgroundColor: C.card,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 17,
        padding: 18,
        marginBottom: 24,
    },
    healthCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    healthScore: {
        color: C.white,
        fontSize: 37,
        fontWeight: '900',
        marginTop: 8,
    },
    scoreMaximum: {
        color: C.muted,
        fontSize: 15,
    },
    healthStatusBadge: {
        borderRadius: 10,
        paddingHorizontal: 11,
        paddingVertical: 8,
    },
    healthStatusText: {
        fontSize: 11,
        fontWeight: '900',
    },
    healthScoreTrack: {
        height: 8,
        borderRadius: 4,
        backgroundColor: '#26384D',
        marginTop: 17,
        overflow: 'hidden',
    },
    healthScoreFill: {
        height: '100%',
        borderRadius: 4,
    },
    healthSummary: {
        color: '#B8C8DB',
        fontSize: 12,
        lineHeight: 20,
        marginTop: 16,
    },
    healthFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 19,
        gap: 8,
    },
    healthFooterText: {
        color: C.muted,
        fontSize: 10,
    },
    predictionCard: {
        borderRadius: 19,
        borderWidth: 1,
        borderColor: '#514279',
        padding: 18,
        marginBottom: 24,
    },
    predictionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    predictionHeaderIcon: {
        width: 46,
        height: 46,
        borderRadius: 14,
        backgroundColor: '#352D60',
        alignItems: 'center',
        justifyContent: 'center',
    },
    predictionHeaderText: {
        flex: 1,
        marginLeft: 12,
    },
    predictionTitle: {
        color: C.white,
        fontSize: 15,
        fontWeight: '900',
    },
    predictionSubtitle: {
        color: '#B8AED7',
        fontSize: 11,
        marginTop: 6,
    },
    predictionScores: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginTop: 25,
    },
    predictionScoreBlock: {
        alignItems: 'center',
    },
    predictionScoreLabel: {
        color: '#B8AED7',
        fontSize: 10,
        marginBottom: 10,
    },
    predictionScoreValue: {
        color: C.white,
        fontSize: 31,
        fontWeight: '900',
    },
    predictionRiskRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 23,
    },
    riskBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 11,
        paddingVertical: 8,
        borderRadius: 10,
    },
    riskBadgeText: {
        fontSize: 11,
        fontWeight: '900',
    },
    predictionSampleCount: {
        color: '#B8AED7',
        fontSize: 11,
    },
    scoreDifferenceRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
        marginTop: 19,
    },
    scoreDifferenceText: {
        color: '#D2C9E9',
        fontSize: 11,
    },
    insufficientData: {
        color: '#B8AED7',
        fontSize: 11,
        lineHeight: 19,
        marginTop: 18,
    },
    predictionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderTopWidth: 1,
        borderTopColor: '#51476B',
        marginTop: 22,
        paddingTop: 18,
    },
    predictionButtonText: {
        color: C.purple,
        fontSize: 11,
        fontWeight: '900',
    },
    forecastCard: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 16,
        paddingHorizontal: 15,
        marginBottom: 24,
    },
    forecastRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    forecastMetricIcon: {
        width: 40,
        height: 40,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    forecastMetricDetails: {
        flex: 1,
        marginLeft: 11,
    },
    forecastMetricName: {
        color: C.white,
        fontSize: 12,
        fontWeight: '900',
    },
    forecastTrend: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 6,
    },
    forecastTrendText: {
        fontSize: 10,
        fontWeight: '800',
    },
    forecastMetricRight: {
        alignItems: 'flex-end',
    },
    forecastValues: {
        color: C.white,
        fontSize: 12,
        fontWeight: '900',
    },
    forecastRisk: {
        fontSize: 10,
        fontWeight: '800',
        marginTop: 6,
    },
    insightsCard: {
        backgroundColor: C.card,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 17,
        marginBottom: 24,
    },
    insightRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 11,
        marginBottom: 15,
    },
    insightDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: C.purple,
        marginTop: 6,
    },
    insightText: {
        flex: 1,
        color: '#B8C8DB',
        fontSize: 12,
        lineHeight: 20,
    },
    explanationDivider: {
        height: 1,
        backgroundColor: C.border,
        marginVertical: 15,
    },
    explanationTitle: {
        color: C.white,
        fontSize: 13,
        fontWeight: '900',
        marginBottom: 10,
    },
    explanationBody: {
        color: C.muted,
        fontSize: 11,
        lineHeight: 19,
    },
    recommendationCard: {
        backgroundColor: C.card,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
    },
    recommendationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    recommendationIcon: {
        width: 42,
        height: 42,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recommendationIdentity: {
        flex: 1,
        marginLeft: 11,
    },
    recommendationTitle: {
        color: C.white,
        fontSize: 13,
        fontWeight: '900',
    },
    recommendationSource: {
        color: C.muted,
        fontSize: 9,
        marginTop: 6,
    },
    priorityBadge: {
        borderRadius: 9,
        paddingHorizontal: 9,
        paddingVertical: 7,
    },
    priorityText: {
        fontSize: 9,
        fontWeight: '900',
    },
    recommendationDescription: {
        color: '#C3D0E1',
        fontSize: 12,
        lineHeight: 20,
        marginTop: 16,
    },
    reasonBox: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 10,
        backgroundColor: '#17263B',
        borderRadius: 11,
        padding: 12,
        marginTop: 15,
    },
    reasonText: {
        flex: 1,
        color: C.muted,
        fontSize: 11,
        lineHeight: 18,
    },
    showMoreButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 9,
        backgroundColor: '#15384B',
        borderRadius: 12,
        paddingVertical: 14,
        marginBottom: 23,
    },
    showMoreText: {
        color: C.cyan,
        fontSize: 12,
        fontWeight: '900',
    },
    dataCard: {
        backgroundColor: C.card,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 17,
        marginBottom: 24,
    },
    dataRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    dataLabel: {
        color: C.muted,
        fontSize: 12,
    },
    dataValue: {
        color: C.white,
        fontSize: 12,
        fontWeight: '900',
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
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
        backgroundColor: '#17384D',
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
