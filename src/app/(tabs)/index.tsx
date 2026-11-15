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
import Svg, { Path, Line, Circle } from 'react-native-svg';
import {
  Activity,
  ArrowRight,
  Bell,
  BrainCircuit,
  ChevronDown,
  ChevronRight,
  Clock3,
  Database,
  Heart,
  Moon,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Thermometer,
  TrendingDown,
  TrendingUp,
  Users,
  Wind,
  Zap,
} from 'lucide-react-native';

import { useMissionHealth } from '../../context/MissionHealthContext';
import {
  predictCrewHealth,
  predictMissionHealth,
  getPredictionRiskColor,
  getPredictionRiskLabel,
  type PredictionRisk,
} from '../../services/predictiveHealthEngine';
import {
  getSeverityColor,
  getSeverityLabel,
} from '../../services/healthAlertEngine';

const COLORS = {
  background: '#050B18',
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

const CREW_IDS = CREW.map(member => member.id);

const SAMPLE_INTERVAL_MINUTES = 0.075;

type MetricName =
    | 'heart'
    | 'oxygen'
    | 'temperature'
    | 'sleep'
    | 'respiration';

function formatValue(
    value: number,
    metric: MetricName
): string {
  return metric === 'temperature' || metric === 'sleep'
      ? value.toFixed(1)
      : String(Math.round(value));
}

function MetricIcon({
                      metric,
                      color,
                    }: {
  metric: MetricName;
  color: string;
}) {
  switch (metric) {
    case 'heart':
      return <Heart size={21} color={color} />;
    case 'oxygen':
      return <Wind size={21} color={color} />;
    case 'temperature':
      return <Thermometer size={21} color={color} />;
    case 'sleep':
      return <Moon size={21} color={color} />;
    case 'respiration':
      return <Activity size={21} color={color} />;
  }
}

function VitalCard({
                     label,
                     metric,
                     value,
                     unit,
                     color,
                   }: {
  label: string;
  metric: MetricName;
  value: number;
  unit: string;
  color: string;
}) {
  return (
      <View style={styles.vitalCard}>
        <View
            style={[
              styles.vitalIcon,
              { backgroundColor: color + '18' },
            ]}
        >
          <MetricIcon metric={metric} color={color} />
        </View>

        <Text style={styles.vitalLabel}>{label}</Text>

        <View style={styles.vitalValueRow}>
          <Text style={styles.vitalValue}>
            {formatValue(value, metric)}
          </Text>
          <Text style={styles.vitalUnit}>{unit}</Text>
        </View>
      </View>
  );
}

function TrendChart({
                      values,
                      width,
                    }: {
  values: number[];
  width: number;
}) {
  const chartWidth = Math.max(200, width);
  const chartHeight = 125;
  const padding = 12;

  if (values.length < 2) {
    return (
        <View style={styles.emptyChart}>
          <Text style={styles.mutedText}>
            Waiting for telemetry samples...
          </Text>
        </View>
    );
  }

  const minimum = Math.min(...values);
  const maximum = Math.max(...values);
  const range = Math.max(maximum - minimum, 1);

  const points = values.map((value, index) => ({
    x:
        padding +
        (index / (values.length - 1)) *
        (chartWidth - padding * 2),
    y:
        padding +
        (1 - (value - minimum) / range) *
        (chartHeight - padding * 2),
  }));

  const path = points
      .map(
          (point, index) =>
              `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`
      )
      .join(' ');

  const lastPoint = points[points.length - 1];

  return (
      <Svg width={chartWidth} height={chartHeight}>
        {[0, 1, 2, 3].map(index => {
          const y =
              padding +
              (index / 3) *
              (chartHeight - padding * 2);

          return (
              <Line
                  key={index}
                  x1={padding}
                  y1={y}
                  x2={chartWidth - padding}
                  y2={y}
                  stroke={COLORS.border}
                  strokeWidth={1}
                  strokeDasharray="4 5"
              />
          );
        })}

        <Path
            d={path}
            stroke={COLORS.cyan}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
        />

        <Circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={5}
            fill={COLORS.cyan}
            stroke={COLORS.card}
            strokeWidth={2}
        />
      </Svg>
  );
}

function NavigationCard({
                          title,
                          description,
                          color,
                          icon,
                          onPress,
                        }: {
  title: string;
  description: string;
  color: string;
  icon: React.ReactNode;
  onPress: () => void;
}) {
  return (
      <TouchableOpacity
          style={styles.navigationCard}
          onPress={onPress}
          activeOpacity={0.8}
      >
        <View
            style={[
              styles.navigationIcon,
              { backgroundColor: color + '18' },
            ]}
        >
          {icon}
        </View>

        <View style={styles.navigationContent}>
          <Text style={styles.navigationTitle}>{title}</Text>
          <Text style={styles.navigationDescription}>
            {description}
          </Text>
        </View>

        <ChevronRight color={color} size={20} />
      </TouchableOpacity>
  );
}

function HomeScreen() {
  const router = useRouter();
  const { width } = useWindowDimensions();

  const {
    telemetry,
    tick,
    selectedId,
    setSelectedId,
    history,
    historyLoaded,
    selectedCrewAssessment,
    assessCrew,
    crewReadings,
    triggerAlert,
    activeAlertCount,
    addSample,
  } = useMissionHealth();

  const [crewPickerVisible, setCrewPickerVisible] =
      useState(false);

  const selectedCrew =
      CREW.find(member => member.id === selectedId) ??
      CREW[0];

  const selectedReadings = crewReadings(selectedId);

  const selectedPrediction = useMemo(
      () =>
          predictCrewHealth(selectedId, history, {
            horizonSteps: 5,
            sampleIntervalMinutes: SAMPLE_INTERVAL_MINUTES,
            maxSamples: 30,
          }),
      [selectedId, history]
  );

  const missionPrediction = useMemo(
      () =>
          predictMissionHealth(CREW_IDS, history, {
            horizonSteps: 5,
            sampleIntervalMinutes: SAMPLE_INTERVAL_MINUTES,
            maxSamples: 30,
          }),
      [history]
  );

  const hasPrediction =
      selectedPrediction.sampleCount >= 3 &&
      selectedPrediction.predictedHealthScore !== null;

  const riskColor = hasPrediction
      ? getPredictionRiskColor(selectedPrediction.overallRisk)
      : COLORS.muted;

  const riskLabel = hasPrediction
      ? getPredictionRiskLabel(selectedPrediction.overallRisk)
      : 'Awaiting Data';

  const currentScore = selectedCrewAssessment.score;
  const projectedScore = selectedPrediction.predictedHealthScore;

  const scoreDifference =
      hasPrediction && projectedScore !== null
          ? projectedScore - currentScore
          : null;

  const heartHistory =
      selectedId === 'CM-01'
          ? telemetry.heart.slice(-20)
          : history
              .filter(record => record.crewId === selectedId)
              .sort(
                  (a, b) =>
                      Date.parse(a.timestamp) -
                      Date.parse(b.timestamp)
              )
              .slice(-20)
              .map(record => record.heart);

  const forecastMetrics = selectedPrediction.metrics.filter(
      metric => metric.predictedValue !== null
  );

  const statusColor = getSeverityColor(selectedCrewAssessment.severity);

  const crewStatus = CREW.map(member => {
    const assessment = assessCrew(member.id);
    const prediction = missionPrediction.crew.find(
        item => item.crewId === member.id
    );

    return {
      ...member,
      assessment,
      prediction,
    };
  });

  const openAnalysis = () => router.push('/analysis');
  const openMissionOverview = () => router.push('/missionoverview');
  const openMissionEvents = () => router.push('/missionevents');
  const openMissionReport = () => router.push('/missionreport');
  const openMissionReadiness = () => {
  console.log('COSMIC CARE: OPENING MISSIONREADINESS');
  router.push('/missionreadiness');
};
  const openMissionIntelligence = () => {
    console.log('MISSION INTELLIGENCE BUTTON PRESSED');
    router.push('/missionintelligence');
};
  const openAlerts = () => router.push('/alerts');
  const openAI = () => router.push('/aicare');
  const openCrew = () => router.push('/crew');
  const openVitals = () => router.push('/vitals');
  const openHistory = () => router.push('/history');

  return (
      <SafeAreaView
          style={styles.root}
          edges={['top']}
      >
        <StatusBar barStyle="light-content" />

        <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.content}
        >
          <View style={styles.header}>
            <View>
              <Text style={styles.brand}>✦ COSMIC CARE</Text>
              <Text style={styles.headerSubtitle}>
                ASTRONAUT HEALTH MONITORING
              </Text>
            </View>

            <TouchableOpacity
                style={styles.notificationButton}
                onPress={openAlerts}
            >
              <Bell color={COLORS.cyan} size={23} />
              {activeAlertCount > 0 && (
                  <View style={styles.notificationDot} />
              )}
            </TouchableOpacity>
          </View>

          <LinearGradient
              colors={['#173B58', '#152744', '#101D32']}
              style={styles.hero}
          >
            <View style={styles.heroTop}>
              <View style={styles.livePill}>
                <Radio color={COLORS.green} size={14} />
                <Text style={styles.liveText}>
                  LIVE SIMULATION
                </Text>
              </View>

              <Text style={styles.missionId}>CC-01</Text>
            </View>

            <Text style={styles.heroEyebrow}>
              MISSION HEALTH OVERVIEW
            </Text>

            <Text style={styles.heroTitle}>
              Crew Health Monitor
            </Text>

            <Text style={styles.heroDescription}>
              Real-time fictional astronaut telemetry,
              mission alerts, and predictive health analytics.
            </Text>

            <View style={styles.heroDivider} />

            <View style={styles.heroStats}>
              <View>
                <Text style={styles.heroStatNumber}>04</Text>
                <Text style={styles.heroStatLabel}>
                  CREW MEMBERS
                </Text>
              </View>

              <View>
                <Text style={styles.heroStatNumber}>{tick}</Text>
                <Text style={styles.heroStatLabel}>
                  SIMULATION TICKS
                </Text>
              </View>

              <View>
                <Text style={styles.heroStatNumber}>
                  {history.length}
                </Text>
                <Text style={styles.heroStatLabel}>
                  SAVED RECORDS
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Selected Astronaut
            </Text>
            <Users color={COLORS.muted} size={20} />
          </View>

          <TouchableOpacity
              style={styles.crewPicker}
              onPress={() =>
                  setCrewPickerVisible(value => !value)
              }
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {selectedCrew.initials}
              </Text>
            </View>

            <View style={styles.crewPickerContent}>
              <Text style={styles.crewName}>
                {selectedCrew.name}
              </Text>
              <Text style={styles.crewRole}>
                {selectedCrew.role} · {selectedCrew.id}
              </Text>
            </View>

            <ChevronDown color={COLORS.cyan} size={21} />
          </TouchableOpacity>

          {crewPickerVisible && (
              <View style={styles.crewMenu}>
                {CREW.map(member => (
                    <TouchableOpacity
                        key={member.id}
                        style={styles.crewOption}
                        onPress={() => {
                          setSelectedId(member.id);
                          setCrewPickerVisible(false);
                        }}
                    >
                      <Text
                          style={[
                            styles.crewOptionText,
                            selectedId === member.id && {
                              color: COLORS.cyan,
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
              Health Assessment
            </Text>
            <ShieldCheck color={statusColor} size={21} />
          </View>

          <View style={styles.assessmentCard}>
            <View style={styles.assessmentTop}>
              <View>
                <Text style={styles.cardEyebrow}>
                  CURRENT HEALTH SCORE
                </Text>

                <View style={styles.scoreRow}>
                  <Text style={styles.healthScore}>
                    {currentScore}
                  </Text>
                  <Text style={styles.scoreMaximum}>/100</Text>
                </View>
              </View>

              <View
                  style={[
                    styles.statusBadge,
                    { backgroundColor: statusColor + '18' },
                  ]}
              >
                <Text
                    style={[
                      styles.statusText,
                      { color: statusColor },
                    ]}
                >
                  {getSeverityLabel(selectedCrewAssessment.severity)}
                </Text>
              </View>
            </View>

            <View style={styles.scoreTrack}>
              <View
                  style={[
                    styles.scoreFill,
                    {
                      width: `${Math.max(
                          0,
                          Math.min(100, currentScore)
                      )}%` as `${number}%`,
                      backgroundColor: statusColor,
                    },
                  ]}
              />
            </View>

            <Text style={styles.assessmentDescription}>
              {selectedCrewAssessment.summary}
            </Text>

            <View style={styles.assessmentFooter}>
              <Text style={styles.assessmentFooterText}>
                {selectedCrewAssessment.alerts.length} active
                metric alerts
              </Text>

              <TouchableOpacity onPress={openAlerts}>
                <Text style={styles.inlineLink}>
                  View Alerts
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Live Vital Signs
            </Text>

            <TouchableOpacity onPress={openVitals}>
              <Text style={styles.inlineLink}>View All</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.vitalGrid}>
            <VitalCard
                label="Heart Rate"
                metric="heart"
                value={selectedReadings.heart}
                unit="BPM"
                color={COLORS.pink}
            />

            <VitalCard
                label="Oxygen"
                metric="oxygen"
                value={selectedReadings.oxygen}
                unit="%"
                color={COLORS.cyan}
            />

            <VitalCard
                label="Temperature"
                metric="temperature"
                value={selectedReadings.temperature}
                unit="°C"
                color={COLORS.yellow}
            />

            <VitalCard
                label="Sleep"
                metric="sleep"
                value={selectedReadings.sleep}
                unit="hours"
                color={COLORS.purple}
            />

            <VitalCard
                label="Respiration"
                metric="respiration"
                value={selectedReadings.respiratory}
                unit="/min"
                color={COLORS.green}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Heart Rate Telemetry
            </Text>
            <Activity color={COLORS.cyan} size={20} />
          </View>

          <View style={styles.chartCard}>
            <View style={styles.chartHeader}>
              <View>
                <Text style={styles.chartTitle}>
                  Live Heart Rate Trend
                </Text>
                <Text style={styles.chartSubtitle}>
                  Recent simulated samples
                </Text>
              </View>

              <Text style={styles.chartCurrent}>
                {selectedReadings.heart} BPM
              </Text>
            </View>

            <TrendChart
                values={heartHistory}
                width={Math.max(180, width - 76)}
            />
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Predictive Intelligence
            </Text>
            <Sparkles color={COLORS.purple} size={21} />
          </View>

          <TouchableOpacity
              onPress={openAnalysis}
              activeOpacity={0.85}
          >
            <LinearGradient
                colors={['#29244E', '#182B48', '#101D32']}
                style={styles.predictionCard}
            >
              <View style={styles.predictionHeader}>
                <View style={styles.predictionIcon}>
                  <BrainCircuit
                      color={COLORS.purple}
                      size={27}
                  />
                </View>

                <View style={styles.predictionHeading}>
                  <Text style={styles.predictionTitle}>
                    Predictive Health Analytics
                  </Text>
                  <Text style={styles.predictionSubtitle}>
                    Mathematical trend forecasting
                  </Text>
                </View>

                <ChevronRight
                    color={COLORS.purple}
                    size={21}
                />
              </View>

              <View style={styles.predictionDivider} />

              <View style={styles.predictionStats}>
                <View style={styles.predictionStat}>
                  <Text style={styles.predictionStatLabel}>
                    CURRENT SCORE
                  </Text>

                  <Text style={styles.predictionStatValue}>
                    {selectedPrediction.currentHealthScore ??
                        '--'}
                  </Text>
                </View>

                <ArrowRight
                    color={COLORS.purple}
                    size={23}
                />

                <View style={styles.predictionStat}>
                  <Text style={styles.predictionStatLabel}>
                    FORECAST SCORE
                  </Text>

                  <Text
                      style={[
                        styles.predictionStatValue,
                        { color: COLORS.purple },
                      ]}
                  >
                    {hasPrediction
                        ? projectedScore
                        : '--'}
                  </Text>
                </View>
              </View>

              <View style={styles.predictionRiskRow}>
                <View
                    style={[
                      styles.predictionRiskPill,
                      { backgroundColor: riskColor + '18' },
                    ]}
                >
                  <ShieldAlert
                      color={riskColor}
                      size={15}
                  />

                  <Text
                      style={[
                        styles.predictionRiskText,
                        { color: riskColor },
                      ]}
                  >
                    {riskLabel}
                  </Text>
                </View>

                <Text style={styles.predictionSampleText}>
                  {selectedPrediction.sampleCount} samples
                </Text>
              </View>

              {scoreDifference !== null && (
                  <View style={styles.scoreChangeRow}>
                    {scoreDifference < 0 ? (
                        <TrendingDown
                            color={COLORS.yellow}
                            size={17}
                        />
                    ) : (
                        <TrendingUp
                            color={COLORS.green}
                            size={17}
                        />
                    )}

                    <Text style={styles.scoreChangeText}>
                      {scoreDifference === 0
                          ? 'Projected score remains stable'
                          : `Projected score ${
                              scoreDifference > 0
                                  ? 'increases'
                                  : 'decreases'
                          } by ${Math.abs(scoreDifference)} points`}
                    </Text>
                  </View>
              )}

              {!hasPrediction && (
                  <Text style={styles.predictionEmpty}>
                    At least three saved samples for this
                    astronaut are required to generate a
                    forecast.
                  </Text>
              )}

              <View style={styles.predictionAction}>
                <Text style={styles.predictionActionText}>
                  OPEN ANALYTICS DASHBOARD
                </Text>

                <ArrowRight
                    color={COLORS.purple}
                    size={17}
                />
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {forecastMetrics.length > 0 && (
              <View style={styles.forecastPreview}>
                <View style={styles.forecastPreviewHeader}>
                  <Text style={styles.forecastPreviewTitle}>
                    Forecast Preview
                  </Text>

                  <Text style={styles.forecastPreviewSubtitle}>
                    5 SIMULATED STEPS
                  </Text>
                </View>

                {forecastMetrics.slice(0, 3).map(metric => {
                  const color =
                      metric.risk === 'low'
                          ? COLORS.cyan
                          : getPredictionRiskColor(metric.risk);

                  return (
                      <View
                          key={metric.metric}
                          style={styles.forecastMetricRow}
                      >
                        <View style={styles.forecastMetricLeft}>
                          <Text style={styles.forecastMetricName}>
                            {metric.label}
                          </Text>

                          <Text style={styles.forecastMetricTrend}>
                            {metric.trend.replace('_', ' ')}
                          </Text>
                        </View>

                        <Text style={styles.forecastMetricValue}>
                          {metric.currentValue ?? '--'}
                          {'  →  '}
                          <Text style={{ color }}>
                            {metric.predictedValue ?? '--'}
                          </Text>
                        </Text>
                      </View>
                  );
                })}
              </View>
          )}

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Crew Risk Overview
            </Text>

            <TouchableOpacity onPress={openCrew}>
              <Text style={styles.inlineLink}>
                All Crew
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.crewOverviewCard}>
            <View style={styles.crewOverviewHeader}>
              <View>
                <Text style={styles.cardEyebrow}>
                  MISSION-WIDE FORECAST
                </Text>

                <Text style={styles.crewOverviewSummary}>
                  {missionPrediction.analyzedCrewCount} of 4
                  crew analyzed
                </Text>
              </View>

              <View
                  style={[
                    styles.missionRiskPill,
                    {
                      backgroundColor:
                          missionPrediction.analyzedCrewCount > 0
                              ? getPredictionRiskColor(
                              missionPrediction.overallRisk
                          ) + '18'
                              : COLORS.elevated,
                    },
                  ]}
              >
                <Text
                    style={[
                      styles.missionRiskText,
                      {
                        color:
                            missionPrediction.analyzedCrewCount > 0
                                ? getPredictionRiskColor(
                                    missionPrediction.overallRisk
                                )
                                : COLORS.muted,
                      },
                    ]}
                >
                  {missionPrediction.analyzedCrewCount > 0
                      ? getPredictionRiskLabel(
                          missionPrediction.overallRisk
                      )
                      : 'No Forecast'}
                </Text>
              </View>
            </View>

            <View style={styles.missionSummaryGrid}>
              <View style={styles.missionSummaryTile}>
                <Text style={styles.cardEyebrow}>PROJECTED AVG SCORE</Text>
                <Text style={styles.missionSummaryValue}>
                  {missionPrediction.averagePredictedScore ?? '--'}
                </Text>
              </View>
              <View style={styles.missionSummaryTile}>
                <Text style={styles.cardEyebrow}>FLAGGED CREW</Text>
                <Text style={[styles.missionSummaryValue, { color: COLORS.yellow }]}>
                  {missionPrediction.flaggedCrewIds.length}
                </Text>
              </View>
            </View>

            <TouchableOpacity
                style={styles.missionOverviewAction}
                onPress={openMissionOverview}
                activeOpacity={0.85}
            >
              <View style={styles.missionOverviewActionIcon}>
                <Users color={COLORS.green} size={22} />
              </View>
              <View style={styles.missionOverviewActionText}>
                <Text style={styles.missionOverviewActionTitle}>
                  Mission Predictive Overview
                </Text>
                <Text style={styles.missionOverviewActionSubtitle}>
                  Compare all four crew forecasts and risks
                </Text>
              </View>
              <ChevronRight color={COLORS.green} size={20} />
            </TouchableOpacity>

            {crewStatus.map(member => {
              const hasCrewForecast =
                  (member.prediction?.sampleCount ?? 0) >= 3 &&
                  member.prediction?.predictedHealthScore !=
                  null;

              const crewRisk: PredictionRisk =
                  member.prediction?.overallRisk ?? 'low';

              const indicatorColor = hasCrewForecast
                  ? getPredictionRiskColor(crewRisk)
                  : COLORS.muted;

              return (
                  <TouchableOpacity
                      key={member.id}
                      style={styles.crewOverviewRow}
                      onPress={() => {
                        setSelectedId(member.id);
                        openAnalysis();
                      }}
                  >
                    <View style={styles.crewSmallAvatar}>
                      <Text style={styles.crewSmallInitials}>
                        {member.initials}
                      </Text>
                    </View>

                    <View style={styles.crewOverviewDetails}>
                      <Text style={styles.crewOverviewName}>
                        {member.name}
                      </Text>

                      <Text style={styles.crewOverviewRole}>
                        {member.role}
                      </Text>
                    </View>

                    <View style={styles.crewOverviewScores}>
                      <Text style={styles.crewOverviewScore}>
                        {member.assessment.score}
                        {' → '}
                        {hasCrewForecast
                            ? member.prediction?.predictedHealthScore
                            : '--'}
                      </Text>

                      <Text
                          style={[
                            styles.crewOverviewRisk,
                            { color: indicatorColor },
                          ]}
                      >
                        {hasCrewForecast
                            ? getPredictionRiskLabel(crewRisk)
                            : 'Awaiting Data'}
                      </Text>
                    </View>

                    <ChevronRight
                        color={COLORS.dim}
                        size={17}
                    />
                  </TouchableOpacity>
              );
            })}
          </View>

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Mission Control
            </Text>

            <Zap color={COLORS.yellow} size={20} />
          </View>

          <NavigationCard
              title="Mission Intelligence Summary"
              description="Explore combined crew health, forecasts, readiness, and mission insights"
              color={COLORS.purple}
              icon={
                <BrainCircuit color={COLORS.purple} size={23} />
              }
              onPress={openMissionIntelligence}
          />

          <NavigationCard
              title="Mission Readiness Dashboard"
              description="Review simulated readiness, crew health, and telemetry coverage"
              color={COLORS.purple}
              icon={
                <ShieldCheck color={COLORS.purple} size={23} />
              }
              onPress={openMissionReadiness}
          />

          <NavigationCard
              title="Mission Health Report"
              description="Review all four astronauts, alert counts, and forecast coverage"
              color={COLORS.cyan}
              icon={
                <ShieldCheck color={COLORS.cyan} size={23} />
              }
              onPress={openMissionReport}
          />

          <NavigationCard
              title="Mission Event Log"
              description="Explore simulated telemetry events and health warnings"
              color={COLORS.yellow}
              icon={
                <Clock3 color={COLORS.yellow} size={23} />
              }
              onPress={openMissionEvents}
          />

          <NavigationCard
              title="Mission Predictive Overview"
              description="See crew forecasts, mission risk, and flagged astronauts"
              color={COLORS.green}
              icon={
                <Users color={COLORS.green} size={23} />
              }
              onPress={openMissionOverview}
          />

          <NavigationCard
              title="Predictive Analytics"
              description="Explore simulated health forecasts"
              color={COLORS.purple}
              icon={
                <BrainCircuit
                    color={COLORS.purple}
                    size={23}
                />
              }
              onPress={openAnalysis}
          />

          <NavigationCard
              title="AI Care Assistant"
              description="Review rule-based health guidance"
              color={COLORS.cyan}
              icon={
                <Sparkles
                    color={COLORS.cyan}
                    size={23}
                />
              }
              onPress={openAI}
          />

          <NavigationCard
              title="Mission Alert Center"
              description="Inspect health alerts and severity"
              color={COLORS.yellow}
              icon={
                <Bell
                    color={COLORS.yellow}
                    size={23}
                />
              }
              onPress={openAlerts}
          />

          <NavigationCard
              title="Mission History"
              description="Review stored astronaut telemetry"
              color={COLORS.green}
              icon={
                <Database
                    color={COLORS.green}
                    size={23}
                />
              }
              onPress={openHistory}
          />

          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              Simulation Controls
            </Text>

            <Radio color={COLORS.green} size={20} />
          </View>

          <View style={styles.controlsCard}>
            <TouchableOpacity
                style={styles.controlButton}
                onPress={addSample}
            >
              <Activity color={COLORS.cyan} size={19} />
              <Text style={styles.controlButtonText}>
                Generate Sample
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[
                  styles.controlButton,
                  styles.alertControlButton,
                ]}
                onPress={() => triggerAlert(selectedId)}
            >
              <ShieldAlert
                  color={COLORS.yellow}
                  size={19}
              />

              <Text style={styles.controlButtonText}>
                Demo Alert
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.storageStatus}>
            <Clock3 color={COLORS.cyan} size={17} />

            <Text style={styles.storageStatusText}>
              {historyLoaded
                  ? `${history.length} saved telemetry records`
                  : 'Loading saved telemetry...'}
            </Text>
          </View>

          <View style={styles.disclaimer}>
            <ShieldCheck
                color={COLORS.cyan}
                size={21}
            />

            <Text style={styles.disclaimerText}>
              Cosmic Care is an educational mission
              simulator. All astronaut readings, risk
              assessments, and forecasts are fictional.
              Predictions use mathematical extrapolation
              and are not medically validated.
            </Text>
          </View>

          <Text style={styles.footer}>
            COSMIC CARE · MISSION CC-01
            {'\n'}
            ADVANCED MISSION INTELLIGENCE
          </Text>
        </ScrollView>
      </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
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
  brand: {
    color: COLORS.cyan,
    fontSize: 20,
    fontWeight: '900',
    letterSpacing: 1,
  },
  headerSubtitle: {
    color: COLORS.muted,
    fontSize: 9,
    letterSpacing: 1.1,
    marginTop: 6,
  },
  notificationButton: {
    width: 45,
    height: 45,
    borderRadius: 14,
    backgroundColor: '#153047',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationDot: {
    position: 'absolute',
    right: 10,
    top: 9,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.pink,
  },
  hero: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: '#285676',
    padding: 20,
    marginBottom: 24,
  },
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#194344',
    borderRadius: 20,
    paddingHorizontal: 11,
    paddingVertical: 7,
  },
  liveText: {
    color: COLORS.green,
    fontSize: 9,
    fontWeight: '900',
  },
  missionId: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '900',
  },
  heroEyebrow: {
    color: COLORS.cyan,
    fontSize: 10,
    fontWeight: '800',
    marginTop: 25,
    letterSpacing: 1,
  },
  heroTitle: {
    color: COLORS.white,
    fontSize: 27,
    fontWeight: '900',
    marginTop: 8,
  },
  heroDescription: {
    color: '#BDD1E3',
    fontSize: 12,
    lineHeight: 21,
    marginTop: 11,
  },
  heroDivider: {
    height: 1,
    backgroundColor: '#34536D',
    marginVertical: 21,
  },
  heroStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  heroStatNumber: {
    color: COLORS.white,
    fontSize: 21,
    fontWeight: '900',
  },
  heroStatLabel: {
    color: COLORS.muted,
    fontSize: 9,
    marginTop: 7,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 14,
  },
  sectionTitle: {
    color: COLORS.white,
    fontSize: 19,
    fontWeight: '900',
  },
  inlineLink: {
    color: COLORS.cyan,
    fontSize: 12,
    fontWeight: '800',
  },
  crewPicker: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 15,
    padding: 13,
    marginBottom: 20,
  },
  avatar: {
    width: 45,
    height: 45,
    borderRadius: 13,
    backgroundColor: '#19485A',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: COLORS.cyan,
    fontSize: 14,
    fontWeight: '900',
  },
  crewPickerContent: {
    flex: 1,
    marginLeft: 12,
  },
  crewName: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
  },
  crewRole: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
  },
  crewMenu: {
    backgroundColor: COLORS.elevated,
    borderColor: COLORS.border,
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
    borderBottomColor: COLORS.border,
    borderBottomWidth: 1,
  },
  crewOptionText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '700',
  },
  crewOptionId: {
    color: COLORS.muted,
    fontSize: 11,
  },
  assessmentCard: {
    backgroundColor: COLORS.card,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 17,
    padding: 18,
    marginBottom: 24,
  },
  assessmentTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  cardEyebrow: {
    color: COLORS.muted,
    fontSize: 10,
    fontWeight: '700',
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 9,
  },
  healthScore: {
    color: COLORS.white,
    fontSize: 38,
    fontWeight: '900',
  },
  scoreMaximum: {
    color: COLORS.muted,
    fontSize: 15,
    marginLeft: 3,
  },
  statusBadge: {
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 8,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '900',
  },
  scoreTrack: {
    height: 8,
    borderRadius: 4,
    backgroundColor: '#26384D',
    marginTop: 17,
    overflow: 'hidden',
  },
  scoreFill: {
    height: '100%',
    borderRadius: 4,
  },
  assessmentDescription: {
    color: '#B8C8DB',
    fontSize: 12,
    lineHeight: 20,
    marginTop: 15,
  },
  assessmentFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 19,
  },
  assessmentFooterText: {
    color: COLORS.muted,
    fontSize: 11,
  },
  vitalGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  vitalCard: {
    width: '48%',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    marginBottom: 12,
  },
  vitalIcon: {
    width: 39,
    height: 39,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  vitalLabel: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 15,
  },
  vitalValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 7,
  },
  vitalValue: {
    color: COLORS.white,
    fontSize: 25,
    fontWeight: '900',
  },
  vitalUnit: {
    color: COLORS.muted,
    fontSize: 10,
  },
  chartCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 17,
    padding: 16,
    marginBottom: 25,
    overflow: 'hidden',
  },
  chartHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  chartTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
  },
  chartSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 5,
  },
  chartCurrent: {
    color: COLORS.cyan,
    fontSize: 12,
    fontWeight: '900',
  },
  emptyChart: {
    height: 125,
    alignItems: 'center',
    justifyContent: 'center',
  },
  mutedText: {
    color: COLORS.muted,
    fontSize: 12,
  },
  predictionCard: {
    borderWidth: 1,
    borderColor: '#514279',
    borderRadius: 19,
    padding: 18,
    marginBottom: 14,
  },
  predictionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  predictionIcon: {
    width: 47,
    height: 47,
    borderRadius: 14,
    backgroundColor: '#352D60',
    alignItems: 'center',
    justifyContent: 'center',
  },
  predictionHeading: {
    flex: 1,
    marginLeft: 12,
  },
  predictionTitle: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
  },
  predictionSubtitle: {
    color: '#B8AED7',
    fontSize: 10,
    marginTop: 6,
  },
  predictionDivider: {
    height: 1,
    backgroundColor: '#51476B',
    marginVertical: 19,
  },
  predictionStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  predictionStat: {
    alignItems: 'center',
  },
  predictionStatLabel: {
    color: '#AFAAC9',
    fontSize: 9,
    marginBottom: 10,
  },
  predictionStatValue: {
    color: COLORS.white,
    fontSize: 29,
    fontWeight: '900',
  },
  predictionRiskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 22,
  },
  predictionRiskPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    paddingHorizontal: 11,
    paddingVertical: 8,
    borderRadius: 10,
  },
  predictionRiskText: {
    fontSize: 11,
    fontWeight: '900',
  },
  predictionSampleText: {
    color: '#B8AED7',
    fontSize: 11,
  },
  scoreChangeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 17,
  },
  scoreChangeText: {
    color: '#D2C9E9',
    fontSize: 11,
  },
  predictionEmpty: {
    color: '#B8AED7',
    fontSize: 11,
    lineHeight: 19,
    marginTop: 17,
  },
  predictionAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#51476B',
    paddingTop: 17,
    marginTop: 20,
  },
  predictionActionText: {
    color: COLORS.purple,
    fontSize: 11,
    fontWeight: '900',
  },
  forecastPreview: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    marginBottom: 23,
  },
  forecastPreviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  forecastPreviewTitle: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '900',
  },
  forecastPreviewSubtitle: {
    color: COLORS.muted,
    fontSize: 9,
  },
  forecastMetricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  forecastMetricLeft: {
    flex: 1,
  },
  forecastMetricName: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '700',
  },
  forecastMetricTrend: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
    textTransform: 'capitalize',
  },
  forecastMetricValue: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
  },
  crewOverviewCard: {
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 17,
    padding: 16,
    marginBottom: 25,
  },
  crewOverviewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  crewOverviewSummary: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
    marginTop: 7,
  },
  missionRiskPill: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
  },
  missionRiskText: {
    fontSize: 10,
    fontWeight: '900',
  },
  missionSummaryGrid: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  missionSummaryTile: {
    flex: 1,
    backgroundColor: COLORS.elevated,
    borderRadius: 12,
    padding: 13,
  },
  missionSummaryValue: {
    color: COLORS.cyan,
    fontSize: 24,
    fontWeight: '900',
    marginTop: 9,
  },
  missionOverviewAction: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#173C3A',
    borderRadius: 13,
    padding: 13,
    marginBottom: 14,
  },
  missionOverviewActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 11,
    backgroundColor: '#23554B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  missionOverviewActionText: {
    flex: 1,
    marginLeft: 11,
  },
  missionOverviewActionTitle: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '900',
  },
  missionOverviewActionSubtitle: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 5,
  },
  crewOverviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 13,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  crewSmallAvatar: {
    width: 37,
    height: 37,
    borderRadius: 11,
    backgroundColor: '#1A4055',
    alignItems: 'center',
    justifyContent: 'center',
  },
  crewSmallInitials: {
    color: COLORS.cyan,
    fontSize: 11,
    fontWeight: '900',
  },
  crewOverviewDetails: {
    flex: 1,
    marginLeft: 11,
  },
  crewOverviewName: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '800',
  },
  crewOverviewRole: {
    color: COLORS.muted,
    fontSize: 10,
    marginTop: 4,
  },
  crewOverviewScores: {
    alignItems: 'flex-end',
    marginRight: 8,
  },
  crewOverviewScore: {
    color: COLORS.white,
    fontSize: 12,
    fontWeight: '900',
  },
  crewOverviewRisk: {
    fontSize: 10,
    fontWeight: '800',
    marginTop: 5,
  },
  navigationCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.card,
    borderColor: COLORS.border,
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    marginBottom: 11,
  },
  navigationIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  navigationContent: {
    flex: 1,
    marginLeft: 12,
  },
  navigationTitle: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '900',
  },
  navigationDescription: {
    color: COLORS.muted,
    fontSize: 11,
    marginTop: 5,
  },
  controlsCard: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#17384D',
    borderRadius: 13,
    paddingVertical: 16,
  },
  alertControlButton: {
    backgroundColor: '#42341F',
  },
  controlButtonText: {
    color: COLORS.white,
    fontSize: 11,
    fontWeight: '800',
  },
  storageStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 20,
  },
  storageStatusText: {
    color: COLORS.muted,
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
    color: COLORS.dim,
    fontSize: 9,
    textAlign: 'center',
    lineHeight: 18,
    marginTop: 27,
  },
});
export default HomeScreen;
