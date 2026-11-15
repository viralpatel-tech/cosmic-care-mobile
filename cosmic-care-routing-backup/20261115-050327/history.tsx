
import React, { useMemo, useState } from 'react';
import {
    View,
    Text,
    ScrollView,
    TouchableOpacity,
    StyleSheet,
    StatusBar,
    useWindowDimensions,
} from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, {
    Path,
    Line,
    Circle,
    Defs,
    LinearGradient as SvgGradient,
    Stop,
    Text as SvgText,
} from 'react-native-svg';
import {
    Activity,
    ArrowLeft,
    ArrowRight,
    Bell,
    BrainCircuit,
    CalendarDays,
    ChevronDown,
    ChevronRight,
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
    Zap,
} from 'lucide-react-native';

import {
    useMissionHealth,
} from '../context/MissionHealthContext';

import {
    type HealthMetric,
} from '../services/healthAlertEngine';

import {
    predictCrewHealth,
    getPredictionRiskColor,
    getPredictionRiskLabel,
    getPredictionTrendLabel,
    type MetricPrediction,
    type PredictionTrend,
} from '../services/predictiveHealthEngine';

import {
    type StoredTelemetryReading,
} from '../storage/telemetryStorage';

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
    shortLabel: string;
    unit: string;
    color: string;
}[] = [
    {
        key: 'heart',
        label: 'Heart Rate',
        shortLabel: 'Heart',
        unit: 'BPM',
        color: C.pink,
    },
    {
        key: 'oxygen',
        label: 'Blood Oxygen',
        shortLabel: 'Oxygen',
        unit: '%',
        color: C.cyan,
    },
    {
        key: 'temperature',
        label: 'Body Temperature',
        shortLabel: 'Temp',
        unit: '°C',
        color: C.yellow,
    },
    {
        key: 'sleep',
        label: 'Sleep Duration',
        shortLabel: 'Sleep',
        unit: 'h',
        color: C.purple,
    },
    {
        key: 'respiration',
        label: 'Respiration Rate',
        shortLabel: 'Breathing',
        unit: '/min',
        color: C.green,
    },
];

type DateFilter = 'all' | 'hour' | 'day' | 'week';
type RecordFilter = 'all' | 'demo' | 'normal';

const DATE_FILTERS: {
    key: DateFilter;
    label: string;
}[] = [
    { key: 'all', label: 'All' },
    { key: 'hour', label: '1 Hour' },
    { key: 'day', label: '24 Hours' },
    { key: 'week', label: '7 Days' },
];

const RECORD_FILTERS: {
    key: RecordFilter;
    label: string;
}[] = [
    { key: 'all', label: 'All Records' },
    { key: 'demo', label: 'Demo Alerts' },
    { key: 'normal', label: 'Normal Samples' },
];

const FORECAST_OPTIONS = {
    horizonSteps: 5,
    sampleIntervalMinutes: 0.075,
    maxSamples: 30,
};

function metricIcon(
    metric: HealthMetric,
    color: string,
    size: number = 19
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

function formatMetric(
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

function formatTimestamp(
    timestamp: string
): string {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return 'Unknown time';
    }

    return date.toLocaleString();
}

function formatChartTime(
    timestamp: string
): string {
    const date = new Date(timestamp);

    if (Number.isNaN(date.getTime())) {
        return '--';
    }

    return date.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

function getMetricValue(
    record: StoredTelemetryReading,
    metric: HealthMetric
): number {
    return record[metric];
}

function applyDateFilter(
    records: StoredTelemetryReading[],
    filter: DateFilter,
    now: number
): StoredTelemetryReading[] {
    if (filter === 'all') {
        return records;
    }

    const durations: Record<
        Exclude<DateFilter, 'all'>,
        number
    > = {
        hour: 60 * 60 * 1000,
        day: 24 * 60 * 60 * 1000,
        week: 7 * 24 * 60 * 60 * 1000,
    };

    const cutoff = now - durations[filter];

    return records.filter(record => {
        const timestamp = new Date(
            record.timestamp
        ).getTime();

        return (
            Number.isFinite(timestamp) &&
            timestamp >= cutoff &&
            timestamp <= now
        );
    });
}

function getChartRecords(
    records: StoredTelemetryReading[],
    limit: number = 32
): StoredTelemetryReading[] {
    if (records.length <= limit) {
        return records;
    }

    const result: StoredTelemetryReading[] = [];

    for (let index = 0; index < limit; index++) {
        const position = Math.round(
            (index * (records.length - 1)) /
            (limit - 1)
        );

        result.push(records[position]);
    }

    return result;
}

function HistoricalChart({
                             records,
                             metric,
                             color,
                             width,
                         }: {
    records: StoredTelemetryReading[];
    metric: HealthMetric;
    color: string;
    width: number;
}) {
    const [selectedIndex, setSelectedIndex] =
        useState<number | null>(null);

    const chartRecords = useMemo(
        () => getChartRecords(records, 32),
        [records]
    );

    const values = chartRecords.map(record =>
        getMetricValue(record, metric)
    );

    const chartWidth = Math.max(250, width);
    const chartHeight = 215;

    const left = 44;
    const right = 14;
    const top = 18;
    const bottom = 35;

    const plotWidth =
        chartWidth - left - right;

    const plotHeight =
        chartHeight - top - bottom;

    const minimum =
        values.length > 0
            ? Math.min(...values)
            : 0;

    const maximum =
        values.length > 0
            ? Math.max(...values)
            : 100;

    const spread = Math.max(
        maximum - minimum,
        metric === 'temperature' ? 0.4 : 2
    );

    const padding = spread * 0.2;

    const minY = minimum - padding;
    const maxY = maximum + padding;

    const toX = (index: number) =>
        left +
        (values.length <= 1
            ? plotWidth / 2
            : (index / (values.length - 1)) *
            plotWidth);

    const toY = (value: number) =>
        top +
        ((maxY - value) /
            Math.max(0.0001, maxY - minY)) *
        plotHeight;

    const points = values.map(
        (value, index) => ({
            x: toX(index),
            y: toY(value),
            value,
        })
    );

    const linePath = points
        .map(
            (point, index) =>
                `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
        )
        .join(' ');

    const areaPath =
        points.length > 1
            ? `${linePath} L ${
                points[points.length - 1].x
            } ${top + plotHeight} L ${
                points[0].x
            } ${top + plotHeight} Z`
            : '';

    const activeIndex =
        selectedIndex !== null &&
        selectedIndex >= 0 &&
        selectedIndex < chartRecords.length
            ? selectedIndex
            : chartRecords.length - 1;

    const activeRecord =
        activeIndex >= 0
            ? chartRecords[activeIndex]
            : null;

    const activePoint =
        activeIndex >= 0
            ? points[activeIndex]
            : null;

    if (records.length === 0) {
        return (
            <View style={styles.chartEmpty}>
                <Activity
                    color={C.muted}
                    size={31}
                />

                <Text style={styles.chartEmptyTitle}>
                    No Historical Data
                </Text>

                <Text style={styles.chartEmptyDescription}>
                    No telemetry samples match
                    the selected astronaut and filters.
                </Text>
            </View>
        );
    }

    return (
        <View>
            <View style={styles.chartSummary}>
                <View>
                    <Text style={styles.chartSummaryLabel}>
                        SELECTED VALUE
                    </Text>

                    <Text
                        style={[
                            styles.chartSummaryValue,
                            { color },
                        ]}
                    >
                        {activeRecord
                            ? formatMetric(
                                getMetricValue(
                                    activeRecord,
                                    metric
                                ),
                                metric
                            )
                            : '--'}
                    </Text>
                </View>

                <View style={styles.chartSummaryRight}>
                    <Text style={styles.chartSummaryLabel}>
                        SAMPLE TIME
                    </Text>

                    <Text style={styles.chartSummaryTime}>
                        {activeRecord
                            ? formatChartTime(
                                activeRecord.timestamp
                            )
                            : '--'}
                    </Text>
                </View>
            </View>

            <Svg
                width={chartWidth}
                height={chartHeight}
            >
                <Defs>
                    <SvgGradient
                        id="historyChartFill"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                    >
                        <Stop
                            offset="0%"
                            stopColor={color}
                            stopOpacity={0.24}
                        />

                        <Stop
                            offset="100%"
                            stopColor={color}
                            stopOpacity={0}
                        />
                    </SvgGradient>
                </Defs>

                {[0, 1, 2, 3, 4].map(index => {
                    const y =
                        top +
                        (index / 4) * plotHeight;

                    const label =
                        maxY -
                        (index / 4) *
                        (maxY - minY);

                    return (
                        <React.Fragment key={index}>
                            <Line
                                x1={left}
                                y1={y}
                                x2={chartWidth - right}
                                y2={y}
                                stroke={C.border}
                                strokeWidth={1}
                                strokeDasharray="4 5"
                            />

                            <SvgText
                                x={left - 7}
                                y={y + 4}
                                fill={C.muted}
                                fontSize={9}
                                textAnchor="end"
                            >
                                {metric === 'temperature' ||
                                metric === 'sleep'
                                    ? label.toFixed(1)
                                    : Math.round(label)}
                            </SvgText>
                        </React.Fragment>
                    );
                })}

                {areaPath.length > 0 && (
                    <Path
                        d={areaPath}
                        fill="url(#historyChartFill)"
                    />
                )}

                {points.length > 1 && (
                    <Path
                        d={linePath}
                        fill="none"
                        stroke={color}
                        strokeWidth={2.5}
                        strokeLinecap="round"
                        strokeLinejoin="round"
                    />
                )}

                {points.map((point, index) => (
                    <Circle
                        key={index}
                        cx={point.x}
                        cy={point.y}
                        r={
                            index === activeIndex
                                ? 5.5
                                : 2.5
                        }
                        fill={
                            index === activeIndex
                                ? C.white
                                : color
                        }
                        stroke={color}
                        strokeWidth={
                            index === activeIndex
                                ? 2.5
                                : 0
                        }
                        onPress={() =>
                            setSelectedIndex(index)
                        }
                    />
                ))}

                {activePoint && (
                    <Line
                        x1={activePoint.x}
                        y1={top}
                        x2={activePoint.x}
                        y2={top + plotHeight}
                        stroke={color}
                        strokeWidth={1}
                        strokeDasharray="3 4"
                        opacity={0.7}
                    />
                )}

                <SvgText
                    x={left}
                    y={chartHeight - 9}
                    fill={C.muted}
                    fontSize={10}
                >
                    {chartRecords.length > 0
                        ? formatChartTime(
                            chartRecords[0].timestamp
                        )
                        : '--'}
                </SvgText>

                <SvgText
                    x={chartWidth - right}
                    y={chartHeight - 9}
                    fill={C.muted}
                    fontSize={10}
                    textAnchor="end"
                >
                    {chartRecords.length > 0
                        ? formatChartTime(
                            chartRecords[
                            chartRecords.length - 1
                                ].timestamp
                        )
                        : '--'}
                </SvgText>
            </Svg>

            <Text style={styles.chartHint}>
                Tap a data point to inspect its
                simulated reading.
            </Text>
        </View>
    );
}

function PredictionSummary({
                               prediction,
                               metric,
                               onOpenAnalysis,
                           }: {
    prediction: MetricPrediction | undefined;
    metric: HealthMetric;
    onOpenAnalysis: () => void;
}) {
    if (!prediction) {
        return null;
    }

    const hasForecast =
        prediction.predictedValue !== null;

    const riskColor = hasForecast
        ? getPredictionRiskColor(
            prediction.risk
        )
        : C.muted;

    const metricColor =
        METRICS.find(
            item => item.key === metric
        )?.color ?? C.cyan;

    return (
        <View style={styles.predictionCard}>
            <View style={styles.predictionHeader}>
                <View style={styles.predictionIcon}>
                    <BrainCircuit
                        color={C.purple}
                        size={23}
                    />
                </View>

                <View style={styles.predictionHeaderContent}>
                    <Text style={styles.predictionTitle}>
                        Predictive Trend Summary
                    </Text>

                    <Text style={styles.predictionSubtitle}>
                        Five future simulation steps
                    </Text>
                </View>
            </View>

            <View style={styles.predictionValues}>
                <View>
                    <Text style={styles.predictionValueLabel}>
                        CURRENT
                    </Text>

                    <Text style={styles.predictionValue}>
                        {formatMetric(
                            prediction.currentValue,
                            metric
                        )}
                    </Text>
                </View>

                <ArrowRight
                    color={C.purple}
                    size={22}
                />

                <View>
                    <Text style={styles.predictionValueLabel}>
                        PROJECTED
                    </Text>

                    <Text
                        style={[
                            styles.predictionValue,
                            { color: C.purple },
                        ]}
                    >
                        {formatMetric(
                            prediction.predictedValue,
                            metric
                        )}
                    </Text>
                </View>
            </View>

            <View style={styles.predictionIndicators}>
                <View style={styles.trendIndicator}>
                    {trendIcon(
                        prediction.trend,
                        metricColor
                    )}

                    <Text
                        style={[
                            styles.trendIndicatorText,
                            { color: metricColor },
                        ]}
                    >
                        {getPredictionTrendLabel(
                            prediction.trend
                        )}
                    </Text>
                </View>

                <View
                    style={[
                        styles.riskIndicator,
                        {
                            backgroundColor:
                                riskColor + '18',
                        },
                    ]}
                >
                    <Text
                        style={[
                            styles.riskIndicatorText,
                            { color: riskColor },
                        ]}
                    >
                        {hasForecast
                            ? getPredictionRiskLabel(
                                prediction.risk
                            )
                            : 'Awaiting Data'}
                    </Text>
                </View>
            </View>

            <Text style={styles.predictionExplanation}>
                {prediction.explanation}
            </Text>

            <TouchableOpacity
                style={styles.predictionAction}
                onPress={onOpenAnalysis}
            >
                <Text style={styles.predictionActionText}>
                    OPEN PREDICTIVE ANALYTICS
                </Text>

                <ChevronRight
                    color={C.purple}
                    size={18}
                />
            </TouchableOpacity>
        </View>
    );
}

export default function HistoryScreen() {
    const router = useRouter();

    const { width } = useWindowDimensions();

    const {
        selectedId,
        setSelectedId,
        history,
        historyLoaded,
        refreshHistory,
        addSample,
        tick,
        activeAlertCount,
    } = useMissionHealth();

    const [crewMenuOpen, setCrewMenuOpen] =
        useState(false);

    const [selectedMetric, setSelectedMetric] =
        useState<HealthMetric>('heart');

    const [dateFilter, setDateFilter] =
        useState<DateFilter>('all');

    const [recordFilter, setRecordFilter] =
        useState<RecordFilter>('all');

    const [showAllRecords, setShowAllRecords] =
        useState(false);

    const [now] = useState(() => Date.now());

    const selectedCrew =
        CREW.find(member => member.id === selectedId) ??
        CREW[0];

    const selectedMetricConfig =
        METRICS.find(
            item => item.key === selectedMetric
        ) ?? METRICS[0];

    const crewHistory = useMemo(
        () =>
            history
                .filter(
                    record => record.crewId === selectedId
                )
                .sort(
                    (a, b) =>
                        new Date(a.timestamp).getTime() -
                        new Date(b.timestamp).getTime()
                ),
        [history, selectedId]
    );

    const dateFilteredHistory = useMemo(
        () =>
            applyDateFilter(
                crewHistory,
                dateFilter,
                now
            ),
        [crewHistory, dateFilter, now]
    );

    const filteredHistory = useMemo(
        () =>
            dateFilteredHistory.filter(record => {
                if (recordFilter === 'demo') {
                    return record.demoAlert;
                }

                if (recordFilter === 'normal') {
                    return !record.demoAlert;
                }

                return true;
            }),
        [dateFilteredHistory, recordFilter]
    );

    const prediction = useMemo(
        () =>
            predictCrewHealth(
                selectedId,
                crewHistory,
                FORECAST_OPTIONS
            ),
        [selectedId, crewHistory]
    );

    const selectedPrediction =
        prediction.metrics.find(
            item => item.metric === selectedMetric
        );

    const latestRecord =
        filteredHistory.length > 0
            ? filteredHistory[
            filteredHistory.length - 1
                ]
            : null;

    const metricValues =
        filteredHistory.map(record =>
            getMetricValue(
                record,
                selectedMetric
            )
        );

    const average =
        metricValues.length > 0
            ? metricValues.reduce(
            (sum, value) => sum + value,
            0
        ) / metricValues.length
            : null;

    const minimum =
        metricValues.length > 0
            ? Math.min(...metricValues)
            : null;

    const maximum =
        metricValues.length > 0
            ? Math.max(...metricValues)
            : null;

    const demoAlertCount =
        crewHistory.filter(
            record => record.demoAlert
        ).length;

    const visibleRecords =
        showAllRecords
            ? [...filteredHistory].reverse()
            : [...filteredHistory]
                .reverse()
                .slice(0, 10);

    const chartWidth =
        Math.max(250, width - 72);

    const openAnalysis = () =>
        router.push('/analysis');

    const openAlerts = () =>
        router.push('/alerts');

    const openAI = () =>
        router.push('/aicare');

    const openCrew = () =>
        router.push('/crew');

    const chooseCrew = (id: string) => {
        setSelectedId(id);
        setCrewMenuOpen(false);
        setShowAllRecords(false);
    };

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
                            TELEMETRY HISTORY
                        </Text>
                    </View>

                    <TouchableOpacity
                        style={styles.headerButton}
                        onPress={() => {
                            void refreshHistory();
                        }}
                    >
                        <Database
                            color={C.cyan}
                            size={21}
                        />
                    </TouchableOpacity>
                </View>

                <LinearGradient
                    colors={[
                        '#163C56',
                        '#182B47',
                        '#101D32',
                    ]}
                    style={styles.hero}
                >
                    <View style={styles.heroTop}>
                        <View style={styles.heroBadge}>
                            <Radio
                                color={C.green}
                                size={15}
                            />

                            <Text style={styles.heroBadgeText}>
                                TELEMETRY ACTIVE
                            </Text>
                        </View>

                        <Text style={styles.heroMission}>
                            MISSION CC-01
                        </Text>
                    </View>

                    <View style={styles.heroIcon}>
                        <Database
                            color={C.cyan}
                            size={32}
                        />
                    </View>

                    <Text style={styles.heroTitle}>
                        Mission History
                    </Text>

                    <Text style={styles.heroDescription}>
                        Explore historical simulated
                        astronaut telemetry, compare
                        biometric trends, and review
                        predictive health indicators.
                    </Text>

                    <View style={styles.heroDivider} />

                    <View style={styles.heroStats}>
                        <View>
                            <Text style={styles.heroStatValue}>
                                {history.length}
                            </Text>

                            <Text style={styles.heroStatLabel}>
                                TOTAL RECORDS
                            </Text>
                        </View>

                        <View>
                            <Text style={styles.heroStatValue}>
                                {crewHistory.length}
                            </Text>

                            <Text style={styles.heroStatLabel}>
                                CREW RECORDS
                            </Text>
                        </View>

                        <View>
                            <Text style={styles.heroStatValue}>
                                {demoAlertCount}
                            </Text>

                            <Text style={styles.heroStatLabel}>
                                DEMO ALERTS
                            </Text>
                        </View>
                    </View>
                </LinearGradient>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Select Astronaut
                    </Text>

                    <Users
                        color={C.cyan}
                        size={20}
                    />
                </View>

                <TouchableOpacity
                    style={styles.crewPicker}
                    onPress={() =>
                        setCrewMenuOpen(value => !value)
                    }
                >
                    <View
                        style={[
                            styles.crewAvatar,
                            {
                                backgroundColor:
                                    selectedCrew.color + '20',
                            },
                        ]}
                    >
                        <Text
                            style={[
                                styles.crewInitials,
                                { color: selectedCrew.color },
                            ]}
                        >
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
                                onPress={() =>
                                    chooseCrew(member.id)
                                }
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
                        Date Range
                    </Text>

                    <CalendarDays
                        color={C.muted}
                        size={20}
                    />
                </View>

                <View style={styles.filterRow}>
                    {DATE_FILTERS.map(filter => (
                        <TouchableOpacity
                            key={filter.key}
                            style={[
                                styles.filterButton,
                                dateFilter === filter.key &&
                                styles.filterButtonActive,
                            ]}
                            onPress={() => {
                                setDateFilter(filter.key);
                                setShowAllRecords(false);
                            }}
                        >
                            <Text
                                style={[
                                    styles.filterText,
                                    dateFilter === filter.key &&
                                    styles.filterTextActive,
                                ]}
                            >
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Biometric Metric
                    </Text>

                    <Activity
                        color={C.cyan}
                        size={20}
                    />
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={
                        styles.metricFilterRow
                    }
                >
                    {METRICS.map(metric => (
                        <TouchableOpacity
                            key={metric.key}
                            style={[
                                styles.metricButton,
                                selectedMetric === metric.key && {
                                    borderColor: metric.color,
                                    backgroundColor:
                                        metric.color + '18',
                                },
                            ]}
                            onPress={() =>
                                setSelectedMetric(metric.key)
                            }
                        >
                            {metricIcon(
                                metric.key,
                                metric.color,
                                17
                            )}

                            <Text
                                style={[
                                    styles.metricButtonText,
                                    selectedMetric === metric.key && {
                                        color: metric.color,
                                    },
                                ]}
                            >
                                {metric.shortLabel}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Historical Trend
                    </Text>

                    <Text style={styles.sectionCount}>
                        {filteredHistory.length} samples
                    </Text>
                </View>

                <View style={styles.chartCard}>
                    <View style={styles.chartCardHeader}>
                        <View>
                            <Text style={styles.chartCardTitle}>
                                {selectedMetricConfig.label}
                            </Text>

                            <Text style={styles.chartCardSubtitle}>
                                {selectedMetricConfig.unit}
                                {' · '}
                                Simulated readings
                            </Text>
                        </View>

                        <View
                            style={[
                                styles.chartMetricIcon,
                                {
                                    backgroundColor:
                                        selectedMetricConfig.color +
                                        '18',
                                },
                            ]}
                        >
                            {metricIcon(
                                selectedMetric,
                                selectedMetricConfig.color,
                                23
                            )}
                        </View>
                    </View>

                    <HistoricalChart
                        key={`${selectedId}-${selectedMetric}-${dateFilter}-${recordFilter}`}
                        records={filteredHistory}
                        metric={selectedMetric}
                        color={selectedMetricConfig.color}
                        width={chartWidth}
                    />
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Historical Statistics
                    </Text>

                    <Activity
                        color={selectedMetricConfig.color}
                        size={20}
                    />
                </View>

                <View style={styles.statsGrid}>
                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>
                            AVERAGE
                        </Text>

                        <Text style={styles.statValue}>
                            {formatMetric(
                                average,
                                selectedMetric
                            )}
                        </Text>

                        <Text style={styles.statUnit}>
                            {selectedMetricConfig.unit}
                        </Text>
                    </View>

                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>
                            MINIMUM
                        </Text>

                        <Text style={styles.statValue}>
                            {formatMetric(
                                minimum,
                                selectedMetric
                            )}
                        </Text>

                        <Text style={styles.statUnit}>
                            {selectedMetricConfig.unit}
                        </Text>
                    </View>

                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>
                            MAXIMUM
                        </Text>

                        <Text style={styles.statValue}>
                            {formatMetric(
                                maximum,
                                selectedMetric
                            )}
                        </Text>

                        <Text style={styles.statUnit}>
                            {selectedMetricConfig.unit}
                        </Text>
                    </View>
                </View>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Predictive Intelligence
                    </Text>

                    <Sparkles
                        color={C.purple}
                        size={20}
                    />
                </View>

                <PredictionSummary
                    prediction={selectedPrediction}
                    metric={selectedMetric}
                    onOpenAnalysis={openAnalysis}
                />

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Record Type
                    </Text>

                    <Database
                        color={C.muted}
                        size={20}
                    />
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={
                        styles.recordFilterRow
                    }
                >
                    {RECORD_FILTERS.map(filter => (
                        <TouchableOpacity
                            key={filter.key}
                            style={[
                                styles.recordFilterButton,
                                recordFilter === filter.key &&
                                styles.recordFilterActive,
                            ]}
                            onPress={() => {
                                setRecordFilter(filter.key);
                                setShowAllRecords(false);
                            }}
                        >
                            <Text
                                style={[
                                    styles.recordFilterText,
                                    recordFilter === filter.key &&
                                    styles.recordFilterTextActive,
                                ]}
                            >
                                {filter.label}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>
                        Telemetry Records
                    </Text>

                    <Text style={styles.sectionCount}>
                        {filteredHistory.length} found
                    </Text>
                </View>

                <View style={styles.recordsCard}>
                    {visibleRecords.length === 0 ? (
                        <View style={styles.recordsEmpty}>
                            <Database
                                color={C.muted}
                                size={28}
                            />

                            <Text style={styles.recordsEmptyText}>
                                No records match the selected
                                filters.
                            </Text>
                        </View>
                    ) : (
                        visibleRecords.map(record => (
                            <View
                                key={record.id}
                                style={styles.recordRow}
                            >
                                <View
                                    style={[
                                        styles.recordIcon,
                                        {
                                            backgroundColor:
                                                record.demoAlert
                                                    ? C.pink + '18'
                                                    : C.cyan + '18',
                                        },
                                    ]}
                                >
                                    {record.demoAlert ? (
                                        <ShieldAlert
                                            color={C.pink}
                                            size={19}
                                        />
                                    ) : (
                                        <Activity
                                            color={C.cyan}
                                            size={19}
                                        />
                                    )}
                                </View>

                                <View style={styles.recordDetails}>
                                    <Text style={styles.recordTitle}>
                                        {record.demoAlert
                                            ? 'Demo Alert Sample'
                                            : 'Telemetry Sample'}
                                    </Text>

                                    <Text style={styles.recordTimestamp}>
                                        {formatTimestamp(
                                            record.timestamp
                                        )}
                                    </Text>
                                </View>

                                <View style={styles.recordRight}>
                                    <Text
                                        style={[
                                            styles.recordValue,
                                            {
                                                color:
                                                selectedMetricConfig.color,
                                            },
                                        ]}
                                    >
                                        {formatMetric(
                                            getMetricValue(
                                                record,
                                                selectedMetric
                                            ),
                                            selectedMetric
                                        )}
                                    </Text>

                                    <Text style={styles.recordUnit}>
                                        {selectedMetricConfig.unit}
                                    </Text>
                                </View>
                            </View>
                        ))
                    )}

                    {filteredHistory.length > 10 && (
                        <TouchableOpacity
                            style={styles.showMoreButton}
                            onPress={() =>
                                setShowAllRecords(value => !value)
                            }
                        >
                            <Text style={styles.showMoreText}>
                                {showAllRecords
                                    ? 'Show Recent 10 Records'
                                    : `Show All ${filteredHistory.length} Records`}
                            </Text>

                            <ChevronDown
                                color={C.cyan}
                                size={18}
                            />
                        </TouchableOpacity>
                    )}
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
                            View future simulated health forecasts
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
                    <Bell
                        color={C.pink}
                        size={22}
                    />

                    <View style={styles.actionContent}>
                        <Text style={styles.actionTitle}>
                            Mission Alert Center
                        </Text>

                        <Text style={styles.actionSubtitle}>
                            Review current and projected warnings
                        </Text>
                    </View>

                    <ChevronRight
                        color={C.pink}
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
                            Explore simulated health guidance
                        </Text>
                    </View>

                    <ChevronRight
                        color={C.cyan}
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
                            Compare all four astronauts
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
                        color={C.green}
                        size={17}
                    />

                    <Text style={styles.storageStatusText}>
                        {historyLoaded
                            ? `${history.length} saved records · Simulation tick ${tick}`
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
                        Historical charts show saved
                        fictional telemetry. Forecasts
                        are calculated from recent saved
                        samples and are not medical
                        predictions or validated
                        astronaut health assessments.
                    </Text>
                </View>

                <Text style={styles.footer}>
                    COSMIC CARE · MISSION CC-01
                    {'\n'}
                    ADVANCED TELEMETRY INTELLIGENCE
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
        borderColor: '#315B72',
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
        color: C.cyan,
        fontSize: 10,
        fontWeight: '900',
    },
    heroIcon: {
        width: 70,
        height: 70,
        borderRadius: 20,
        backgroundColor: '#16475B',
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 25,
        marginBottom: 18,
    },
    heroTitle: {
        color: C.white,
        fontSize: 27,
        fontWeight: '900',
    },
    heroDescription: {
        color: '#C2D9E5',
        fontSize: 12,
        lineHeight: 21,
        marginTop: 11,
    },
    heroDivider: {
        height: 1,
        backgroundColor: '#315B72',
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
    sectionCount: {
        color: C.muted,
        fontSize: 11,
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
        alignItems: 'center',
        justifyContent: 'center',
    },
    crewInitials: {
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
    filterRow: {
        flexDirection: 'row',
        gap: 8,
        marginBottom: 22,
    },
    filterButton: {
        flex: 1,
        alignItems: 'center',
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 11,
        paddingVertical: 12,
    },
    filterButtonActive: {
        backgroundColor: '#15384B',
        borderColor: C.cyan,
    },
    filterText: {
        color: C.muted,
        fontSize: 11,
        fontWeight: '800',
    },
    filterTextActive: {
        color: C.cyan,
    },
    metricFilterRow: {
        gap: 9,
        paddingBottom: 22,
    },
    metricButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: C.card,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 11,
        paddingHorizontal: 13,
        paddingVertical: 11,
    },
    metricButtonText: {
        color: C.muted,
        fontSize: 11,
        fontWeight: '800',
    },
    chartCard: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 17,
        padding: 15,
        marginBottom: 24,
        overflow: 'hidden',
    },
    chartCardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    chartCardTitle: {
        color: C.white,
        fontSize: 15,
        fontWeight: '900',
    },
    chartCardSubtitle: {
        color: C.muted,
        fontSize: 11,
        marginTop: 7,
    },
    chartMetricIcon: {
        width: 44,
        height: 44,
        borderRadius: 13,
        alignItems: 'center',
        justifyContent: 'center',
    },
    chartSummary: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    chartSummaryLabel: {
        color: C.muted,
        fontSize: 9,
    },
    chartSummaryValue: {
        fontSize: 24,
        fontWeight: '900',
        marginTop: 6,
    },
    chartSummaryRight: {
        alignItems: 'flex-end',
    },
    chartSummaryTime: {
        color: C.white,
        fontSize: 12,
        fontWeight: '800',
        marginTop: 9,
    },
    chartEmpty: {
        alignItems: 'center',
        paddingVertical: 35,
    },
    chartEmptyTitle: {
        color: C.white,
        fontSize: 15,
        fontWeight: '900',
        marginTop: 15,
    },
    chartEmptyDescription: {
        color: C.muted,
        fontSize: 12,
        lineHeight: 20,
        textAlign: 'center',
        marginTop: 10,
    },
    chartHint: {
        color: C.muted,
        fontSize: 10,
        textAlign: 'center',
        marginTop: 8,
    },
    statsGrid: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 24,
    },
    statCard: {
        flex: 1,
        backgroundColor: C.card,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 14,
        padding: 12,
    },
    statLabel: {
        color: C.muted,
        fontSize: 9,
        fontWeight: '800',
    },
    statValue: {
        color: C.white,
        fontSize: 22,
        fontWeight: '900',
        marginTop: 12,
    },
    statUnit: {
        color: C.muted,
        fontSize: 10,
        marginTop: 6,
    },
    predictionCard: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: '#4B426F',
        borderRadius: 17,
        padding: 17,
        marginBottom: 24,
    },
    predictionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    predictionIcon: {
        width: 44,
        height: 44,
        borderRadius: 13,
        backgroundColor: '#332B55',
        alignItems: 'center',
        justifyContent: 'center',
    },
    predictionHeaderContent: {
        flex: 1,
        marginLeft: 12,
    },
    predictionTitle: {
        color: C.white,
        fontSize: 14,
        fontWeight: '900',
    },
    predictionSubtitle: {
        color: C.muted,
        fontSize: 11,
        marginTop: 6,
    },
    predictionValues: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        alignItems: 'center',
        marginTop: 25,
    },
    predictionValueLabel: {
        color: C.muted,
        fontSize: 10,
        marginBottom: 9,
    },
    predictionValue: {
        color: C.white,
        fontSize: 27,
        fontWeight: '900',
    },
    predictionIndicators: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 23,
    },
    trendIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    trendIndicatorText: {
        fontSize: 11,
        fontWeight: '900',
    },
    riskIndicator: {
        borderRadius: 10,
        paddingHorizontal: 11,
        paddingVertical: 8,
    },
    riskIndicatorText: {
        fontSize: 11,
        fontWeight: '900',
    },
    predictionExplanation: {
        color: '#B8C8DB',
        fontSize: 11,
        lineHeight: 19,
        marginTop: 19,
    },
    predictionAction: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: C.border,
        marginTop: 19,
        paddingTop: 16,
    },
    predictionActionText: {
        color: C.purple,
        fontSize: 10,
        fontWeight: '900',
    },
    recordFilterRow: {
        gap: 9,
        paddingBottom: 21,
    },
    recordFilterButton: {
        backgroundColor: C.card,
        borderWidth: 1,
        borderColor: C.border,
        borderRadius: 11,
        paddingHorizontal: 14,
        paddingVertical: 12,
    },
    recordFilterActive: {
        backgroundColor: '#15384B',
        borderColor: C.cyan,
    },
    recordFilterText: {
        color: C.muted,
        fontSize: 11,
        fontWeight: '800',
    },
    recordFilterTextActive: {
        color: C.cyan,
    },
    recordsCard: {
        backgroundColor: C.card,
        borderColor: C.border,
        borderWidth: 1,
        borderRadius: 16,
        paddingHorizontal: 15,
        marginBottom: 24,
    },
    recordRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: C.border,
    },
    recordIcon: {
        width: 39,
        height: 39,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    recordDetails: {
        flex: 1,
        marginLeft: 11,
    },
    recordTitle: {
        color: C.white,
        fontSize: 12,
        fontWeight: '900',
    },
    recordTimestamp: {
        color: C.muted,
        fontSize: 10,
        marginTop: 6,
    },
    recordRight: {
        alignItems: 'flex-end',
    },
    recordValue: {
        fontSize: 17,
        fontWeight: '900',
    },
    recordUnit: {
        color: C.muted,
        fontSize: 10,
        marginTop: 5,
    },
    recordsEmpty: {
        alignItems: 'center',
        paddingVertical: 30,
    },
    recordsEmptyText: {
        color: C.muted,
        fontSize: 12,
        marginTop: 12,
        textAlign: 'center',
    },
    showMoreButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 9,
        paddingVertical: 17,
    },
    showMoreText: {
        color: C.cyan,
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
