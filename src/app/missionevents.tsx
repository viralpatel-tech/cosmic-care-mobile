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
    Bell,
    BrainCircuit,
    ChevronRight,
    ChevronDown,
    Clock3,
    Database,
    Filter,
    HeartPulse,
    Info,
    Radio,
    ShieldCheck,
    TriangleAlert,
    Users,
} from 'lucide-react-native';
import { useMissionHealth } from '../context/MissionHealthContext';
import { assessCrewHealth, getSeverityColor, getSeverityLabel, type AlertSeverity } from '../services/healthAlertEngine';
import { predictCrewHealth, getPredictionRiskColor, getPredictionRiskLabel, type PredictionRisk } from '../services/predictiveHealthEngine';

type EventKind = 'telemetry' | 'alert' | 'forecast' | 'demo';
type EventFilter = 'all' | EventKind;
type PriorityFilter = 'all' | 'attention' | 'critical';
type SortMode = 'newest' | 'priority';
type MissionEvent = {
    id: string;
    crewId: string;
    timestamp: string;
    kind: EventKind;
    title: string;
    description: string;
    color: string;
    priority: number;
    details: string;
};

const COLORS = {
    background: '#050B18',
    card: '#101D32',
    elevated: '#152640',
    border: '#263A56',
    cyan: '#44E4F4',
    purple: '#A78BFA',
    green: '#4ADEA3',
    yellow: '#FBBF24',
    red: '#FB7185',
    white: '#F4F8FF',
    muted: '#93A6C4',
};

const CREW = [
    { id: 'CM-01', name: 'Alex Morgan', role: 'Commander' },
    { id: 'CM-02', name: 'Maya Chen', role: 'Flight Engineer' },
    { id: 'CM-03', name: 'Jordan Lee', role: 'Mission Specialist' },
    { id: 'CM-04', name: 'Sam Rivera', role: 'Medical Officer' },
];

const FILTERS: { id: EventFilter; label: string }[] = [
    { id: 'all', label: 'All Events' },
    { id: 'alert', label: 'Alerts' },
    { id: 'forecast', label: 'Forecasts' },
    { id: 'demo', label: 'Demo' },
    { id: 'telemetry', label: 'Telemetry' },
];

const severityPriority: Record<AlertSeverity, number> = {
    normal: 0,
    advisory: 1,
    warning: 2,
    critical: 3,
};

const riskPriority: Record<PredictionRisk, number> = {
    low: 0,
    elevated: 1,
    high: 2,
    critical: 3,
};

function formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return 'Unknown time';
    return date.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
    });
}

function EventIcon({ kind, color }: { kind: EventKind; color: string }) {
    if (kind === 'alert') return <TriangleAlert size={19} color={color} />;
    if (kind === 'forecast') return <BrainCircuit size={19} color={color} />;
    if (kind === 'demo') return <Radio size={19} color={color} />;
    return <Activity size={19} color={color} />;
}

export default function MissionEventsScreen() {
    const router = useRouter();
    const { history, historyLoaded, addSample, selectedId, setSelectedId } = useMissionHealth();
    const [crewFilter, setCrewFilter] = useState('all');
    const [kindFilter, setKindFilter] = useState<EventFilter>('all');
    const [showAll, setShowAll] = useState(false);
    const [priorityFilter, setPriorityFilter] = useState<PriorityFilter>('all');
    const [sortMode, setSortMode] = useState<SortMode>('newest');
    const [expandedEventId, setExpandedEventId] = useState<string | null>(null);

    const events = useMemo(() => {
        const result: MissionEvent[] = [];
        const recent = [...history]
            .sort((a, b) => Date.parse(b.timestamp) - Date.parse(a.timestamp))
            .slice(0, 160);

        for (const record of recent) {
            const crewName = CREW.find(member => member.id === record.crewId)?.name ?? record.crewId;
            const reading = {
                heart: record.heart,
                oxygen: record.oxygen,
                temperature: record.temperature,
                sleep: record.sleep,
                respiration: record.respiration,
            };
            const assessment = assessCrewHealth(record.crewId, reading);
            result.push({
                id: `telemetry-${record.id}`,
                crewId: record.crewId,
                timestamp: record.timestamp,
                kind: 'telemetry',
                title: 'Telemetry sample recorded',
                description: `${crewName} · HR ${record.heart} BPM · SpO₂ ${record.oxygen}% · Temperature ${record.temperature.toFixed(1)}°C`,
                color: COLORS.cyan,
                priority: 0,
                details: `Recorded reading: heart ${record.heart} BPM, oxygen ${record.oxygen}%, temperature ${record.temperature.toFixed(1)}°C, sleep ${record.sleep.toFixed(1)} hours, respiration ${record.respiration}/min. This event is reconstructed from saved local telemetry.`,
            });
            if (record.demoAlert) {
                result.push({
                    id: `demo-${record.id}`,
                    crewId: record.crewId,
                    timestamp: record.timestamp,
                    kind: 'demo',
                    title: 'Simulated alert event',
                    description: `${crewName} · A demonstration alert was included in this saved telemetry sample.`,
                    color: COLORS.yellow,
                    priority: 2,
                    details: 'This sample was tagged as a demonstration alert. It is fictional and is intended for testing the mission interface.',
                });
            }
            if (assessment.severity !== 'normal') {
                result.push({
                    id: `alert-${record.id}`,
                    crewId: record.crewId,
                    timestamp: record.timestamp,
                    kind: 'alert',
                    title: `${getSeverityLabel(assessment.severity)} health assessment`,
                    description: `${crewName} · ${assessment.summary}`,
                    color: getSeverityColor(assessment.severity),
                    priority: severityPriority[assessment.severity],
                    details: `Simulated health score ${assessment.score}/100. ${assessment.alerts.length} metric alert(s). ${assessment.alerts.map(alert => `${alert.title}: ${alert.message}`).join(' | ') || assessment.summary}`,
                });
            }
        }

        for (const member of CREW) {
            const prediction = predictCrewHealth(member.id, history, {
                horizonSteps: 5,
                sampleIntervalMinutes: 0.075,
                maxSamples: 30,
            });
            if (prediction.predictedHealthScore === null || prediction.latestTimestamp === null) continue;
            const risk = prediction.overallRisk;
            result.push({
                id: `forecast-${member.id}-${prediction.latestTimestamp}`,
                crewId: member.id,
                timestamp: prediction.latestTimestamp,
                kind: 'forecast',
                title: `${getPredictionRiskLabel(risk)} forecast risk`,
                description: `${member.name} · Projected health score ${prediction.predictedHealthScore}/100 · ${prediction.sampleCount} samples analyzed.`,
                color: getPredictionRiskColor(risk),
                priority: riskPriority[risk],
                details: `Current modeled score: ${prediction.currentHealthScore ?? '--'}/100. Projected score: ${prediction.predictedHealthScore}/100. Confidence: ${prediction.confidence}. Forecast uses ${prediction.sampleCount} saved samples and a five-step mathematical extrapolation. This is not a historical forecast event or a medical diagnosis.`,
            });
        }

        return result.sort((a, b) => {
            const delta = Date.parse(b.timestamp) - Date.parse(a.timestamp);
            return delta || b.priority - a.priority;
        });
    }, [history]);

    const filtered = useMemo(() => {
        const matches = events.filter(event =>
            (crewFilter === 'all' || event.crewId === crewFilter) &&
            (kindFilter === 'all' || event.kind === kindFilter) &&
            (priorityFilter === 'all' ||
                (priorityFilter === 'attention' && event.priority >= 1) ||
                (priorityFilter === 'critical' && event.priority >= 3))
        );
        if (sortMode === 'priority') {
            return matches.sort((a, b) => b.priority - a.priority || Date.parse(b.timestamp) - Date.parse(a.timestamp));
        }
        return matches;
    }, [events, crewFilter, kindFilter, priorityFilter, sortMode]);
    const visible = showAll ? filtered : filtered.slice(0, 30);
    const resetFilters = () => {
        setCrewFilter('all');
        setKindFilter('all');
        setPriorityFilter('all');
        setSortMode('newest');
        setShowAll(false);
        setExpandedEventId(null);
    };
    const alertCount = events.filter(event => event.kind === 'alert').length;
    const demoCount = events.filter(event => event.kind === 'demo').length;
    const forecastCount = events.filter(event => event.kind === 'forecast').length;

    const openEvent = (event: MissionEvent) => {
        setSelectedId(event.crewId);
        if (event.kind === 'forecast') router.push('/analysis');
        else if (event.kind === 'alert' || event.kind === 'demo') router.push('/alerts');
        else router.push('/history');
    };

    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <StatusBar barStyle="light-content" />
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.header}>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.replace('/')}>
                        <ArrowLeft size={21} color={COLORS.white} />
                    </TouchableOpacity>
                    <View style={styles.headerText}>
                        <Text style={styles.brand}>✦ COSMIC CARE</Text>
                        <Text style={styles.subtitle}>MISSION INTELLIGENCE</Text>
                    </View>
                    <TouchableOpacity style={styles.backButton} onPress={() => router.push('/missionoverview')}>
                        <Users size={21} color={COLORS.cyan} />
                    </TouchableOpacity>
                </View>

                <LinearGradient colors={['#243B60', '#182B48', '#101D32']} style={styles.hero}>
                    <View style={styles.livePill}>
                        <Radio size={14} color={COLORS.green} />
                        <Text style={styles.liveText}>SIMULATION EVENT STREAM</Text>
                    </View>
                    <View style={styles.heroTitleRow}>
                        <View style={styles.heroIcon}><Database size={28} color={COLORS.cyan} /></View>
                        <Text style={styles.heroTitle}>Mission Event Log</Text>
                    </View>
                    <Text style={styles.heroDescription}>
                        Review saved astronaut telemetry, simulated alert events, and the latest mathematical health forecasts in one timeline.
                    </Text>
                    <View style={styles.heroDivider} />
                    <View style={styles.statRow}>
                        <View><Text style={styles.statValue}>{history.length}</Text><Text style={styles.statLabel}>SAVED SAMPLES</Text></View>
                        <View><Text style={[styles.statValue, { color: COLORS.yellow }]}>{alertCount}</Text><Text style={styles.statLabel}>ALERT EVENTS</Text></View>
                        <View><Text style={[styles.statValue, { color: COLORS.purple }]}>{forecastCount}</Text><Text style={styles.statLabel}>FORECASTS</Text></View>
                    </View>
                </LinearGradient>

                <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>Event Filters</Text>
                    <Filter size={19} color={COLORS.cyan} />
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    <TouchableOpacity style={[styles.chip, crewFilter === 'all' && styles.chipActive]} onPress={() => { setCrewFilter('all'); setShowAll(false); }}>
                        <Text style={[styles.chipText, crewFilter === 'all' && styles.chipTextActive]}>All Crew</Text>
                    </TouchableOpacity>
                    {CREW.map(member => (
                        <TouchableOpacity key={member.id} style={[styles.chip, crewFilter === member.id && styles.chipActive]} onPress={() => { setCrewFilter(member.id); setShowAll(false); }}>
                            <Text style={[styles.chipText, crewFilter === member.id && styles.chipTextActive]}>{member.id}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
                    {FILTERS.map(filter => (
                        <TouchableOpacity key={filter.id} style={[styles.chip, kindFilter === filter.id && styles.chipPurple]} onPress={() => { setKindFilter(filter.id); setShowAll(false); }}>
                            <Text style={[styles.chipText, kindFilter === filter.id && styles.chipTextActive]}>{filter.label}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>

                <View style={styles.filterOptions}>
                    <Text style={styles.filterLabel}>PRIORITY</Text>
                    <View style={styles.filterRow}>
                        {([
                            { id: 'all', label: 'Any' },
                            { id: 'attention', label: 'Needs attention' },
                            { id: 'critical', label: 'Critical' },
                        ] as { id: PriorityFilter; label: string }[]).map(option => (
                            <TouchableOpacity key={option.id} style={[styles.smallChip, priorityFilter === option.id && styles.chipActive]} onPress={() => { setPriorityFilter(option.id); setShowAll(false); }}>
                                <Text style={[styles.chipText, priorityFilter === option.id && styles.chipTextActive]}>{option.label}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                    <Text style={styles.filterLabel}>SORT EVENTS</Text>
                    <View style={styles.filterRow}>
                        <TouchableOpacity style={[styles.smallChip, sortMode === 'newest' && styles.chipPurple]} onPress={() => setSortMode('newest')}><Text style={[styles.chipText, sortMode === 'newest' && styles.chipTextActive]}>Newest first</Text></TouchableOpacity>
                        <TouchableOpacity style={[styles.smallChip, sortMode === 'priority' && styles.chipPurple]} onPress={() => setSortMode('priority')}><Text style={[styles.chipText, sortMode === 'priority' && styles.chipTextActive]}>Highest priority</Text></TouchableOpacity>
                        <TouchableOpacity style={styles.resetButton} onPress={resetFilters}><Text style={styles.resetText}>Reset</Text></TouchableOpacity>
                    </View>
                </View>

                <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>Event Timeline</Text>
                    <Text style={styles.count}>{filtered.length} events</Text>
                </View>
                {!historyLoaded ? (
                    <View style={styles.emptyCard}><Clock3 size={28} color={COLORS.cyan} /><Text style={styles.emptyTitle}>Loading telemetry history...</Text></View>
                ) : visible.length === 0 ? (
                    <View style={styles.emptyCard}>
                        <ShieldCheck size={30} color={COLORS.green} />
                        <Text style={styles.emptyTitle}>No matching events</Text>
                        <Text style={styles.emptyDescription}>Generate a simulated telemetry sample or change your filters.</Text>
                    </View>
                ) : (
                    visible.map(event => {
                        const member = CREW.find(item => item.id === event.crewId);
                        return (
                            <TouchableOpacity key={event.id} style={styles.eventCard} activeOpacity={0.8} onPress={() => setExpandedEventId(current => current === event.id ? null : event.id)}>
                                <View style={styles.eventTop}>
                                    <View style={[styles.eventIcon, { backgroundColor: event.color + '18' }]}>
                                        <EventIcon kind={event.kind} color={event.color} />
                                    </View>
                                    <View style={styles.eventTitleArea}>
                                        <Text style={styles.eventTitle}>{event.title}</Text>
                                        <Text style={styles.eventTime}>{formatTimestamp(event.timestamp)}</Text>
                                    </View>
                                    {expandedEventId === event.id ? <ChevronDown size={18} color={COLORS.cyan} /> : <ChevronRight size={18} color={COLORS.muted} />}
                                </View>
                                <Text style={styles.eventDescription}>{event.description}</Text>
                                {expandedEventId === event.id && (
                                    <View style={styles.eventDetails}>
                                        <Text style={styles.detailHeading}>EVENT DETAILS</Text>
                                        <Text style={styles.detailText}>{event.details}</Text>
                                        <Text style={styles.detailMeta}>Priority: {event.priority === 3 ? 'Critical' : event.priority === 2 ? 'Warning' : event.priority === 1 ? 'Advisory' : 'Informational'}</Text>
                                        <TouchableOpacity style={styles.detailAction} onPress={() => openEvent(event)}>
                                            <Text style={styles.detailActionText}>OPEN RELATED SCREEN</Text>
                                            <ChevronRight size={17} color={COLORS.cyan} />
                                        </TouchableOpacity>
                                    </View>
                                )}
                                <View style={styles.eventFooter}>
                                    <Text style={styles.eventCrew}>{member?.name ?? event.crewId} · {event.crewId}</Text>
                                    <Text style={[styles.eventKind, { color: event.color }]}>{event.kind.toUpperCase()}</Text>
                                </View>
                            </TouchableOpacity>
                        );
                    })
                )}
                {!showAll && filtered.length > visible.length && (
                    <TouchableOpacity style={styles.moreButton} onPress={() => setShowAll(true)}>
                        <Text style={styles.moreText}>SHOW ALL {filtered.length} EVENTS</Text>
                        <ChevronRight size={18} color={COLORS.cyan} />
                    </TouchableOpacity>
                )}

                <View style={styles.sectionHeading}>
                    <Text style={styles.sectionTitle}>Mission Actions</Text>
                    <HeartPulse size={20} color={COLORS.purple} />
                </View>
                <TouchableOpacity style={styles.actionCard} onPress={addSample}>
                    <Activity size={22} color={COLORS.cyan} />
                    <View style={styles.actionContent}><Text style={styles.actionTitle}>Generate Sample</Text><Text style={styles.actionSubtitle}>Add fictional astronaut telemetry</Text></View>
                    <ChevronRight size={19} color={COLORS.cyan} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/missionoverview')}>
                    <Users size={22} color={COLORS.green} />
                    <View style={styles.actionContent}><Text style={styles.actionTitle}>Mission Overview</Text><Text style={styles.actionSubtitle}>Compare all four crew forecasts</Text></View>
                    <ChevronRight size={19} color={COLORS.green} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/alerts')}>
                    <Bell size={22} color={COLORS.yellow} />
                    <View style={styles.actionContent}><Text style={styles.actionTitle}>Alert Center</Text><Text style={styles.actionSubtitle}>Review active simulated warnings</Text></View>
                    <ChevronRight size={19} color={COLORS.yellow} />
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionCard} onPress={() => router.push('/history')}>
                    <Database size={22} color={COLORS.purple} />
                    <View style={styles.actionContent}><Text style={styles.actionTitle}>Telemetry History</Text><Text style={styles.actionSubtitle}>Explore saved health readings</Text></View>
                    <ChevronRight size={19} color={COLORS.purple} />
                </TouchableOpacity>
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Simulation Summary</Text>
                    <Text style={styles.summaryText}>{demoCount} demo-tagged records · {events.length} timeline entries · Selected astronaut: {selectedId}</Text>
                </View>
                <View style={styles.disclaimer}>
                    <Info size={20} color={COLORS.cyan} />
                    <Text style={styles.disclaimerText}>Cosmic Care uses fictional astronaut telemetry. This timeline is reconstructed from locally saved samples and the latest simulated forecasts; it is not a permanent clinical audit trail. All health assessments and predictions are illustrative, not medically validated.</Text>
                </View>
                <Text style={styles.footer}>COSMIC CARE · MISSION CC-01{'\n'}MISSION EVENT INTELLIGENCE</Text>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: COLORS.background },
    content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 50 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 22 },
    backButton: { width: 44, height: 44, borderRadius: 13, backgroundColor: COLORS.card, justifyContent: 'center', alignItems: 'center' },
    headerText: { flex: 1, marginLeft: 13 },
    brand: { color: COLORS.cyan, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
    subtitle: { color: COLORS.muted, fontSize: 9, letterSpacing: 1, marginTop: 5 },
    hero: { padding: 20, borderRadius: 22, borderWidth: 1, borderColor: '#355779', marginBottom: 23 },
    livePill: { alignSelf: 'flex-start', flexDirection: 'row', gap: 7, alignItems: 'center', borderRadius: 20, backgroundColor: '#194344', paddingHorizontal: 11, paddingVertical: 8 },
    liveText: { color: COLORS.green, fontSize: 9, fontWeight: '900' },
    heroTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 13, marginTop: 24 },
    heroIcon: { width: 52, height: 52, borderRadius: 15, backgroundColor: '#22465D', justifyContent: 'center', alignItems: 'center' },
    heroTitle: { color: COLORS.white, fontSize: 24, fontWeight: '900', flexShrink: 1 },
    heroDescription: { color: '#BFD1E4', fontSize: 12, lineHeight: 21, marginTop: 16 },
    heroDivider: { height: 1, backgroundColor: '#34536D', marginVertical: 20 },
    statRow: { flexDirection: 'row', justifyContent: 'space-between' },
    statValue: { color: COLORS.white, fontSize: 22, fontWeight: '900' },
    statLabel: { color: COLORS.muted, fontSize: 9, marginTop: 7 },
    sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 14 },
    sectionTitle: { color: COLORS.white, fontSize: 19, fontWeight: '900' },
    chips: { gap: 9, paddingBottom: 12 },
    filterOptions: { marginTop: 2, marginBottom: 8 },
    filterLabel: { color: COLORS.muted, fontSize: 10, fontWeight: '800', marginTop: 8, marginBottom: 9, letterSpacing: 1 },
    filterRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 10, alignItems: 'center' },
    smallChip: { paddingHorizontal: 11, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
    resetButton: { paddingHorizontal: 12, paddingVertical: 10 },
    resetText: { color: COLORS.cyan, fontSize: 11, fontWeight: '800' },
    chip: { paddingHorizontal: 13, paddingVertical: 10, borderRadius: 11, borderWidth: 1, borderColor: COLORS.border, backgroundColor: COLORS.card },
    chipActive: { backgroundColor: '#17475B', borderColor: COLORS.cyan },
    chipPurple: { backgroundColor: '#332A52', borderColor: COLORS.purple },
    chipText: { color: COLORS.muted, fontSize: 11, fontWeight: '800' },
    chipTextActive: { color: COLORS.white },
    count: { color: COLORS.muted, fontSize: 11 },
    emptyCard: { alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 16, padding: 25, marginBottom: 20 },
    emptyTitle: { color: COLORS.white, fontSize: 15, fontWeight: '900', marginTop: 13 },
    emptyDescription: { color: COLORS.muted, fontSize: 12, lineHeight: 19, textAlign: 'center', marginTop: 10 },
    eventCard: { backgroundColor: COLORS.card, borderRadius: 16, borderWidth: 1, borderColor: COLORS.border, padding: 15, marginBottom: 11 },
    eventTop: { flexDirection: 'row', alignItems: 'center' },
    eventIcon: { width: 43, height: 43, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    eventTitleArea: { flex: 1, marginLeft: 11 },
    eventTitle: { color: COLORS.white, fontSize: 13, fontWeight: '900' },
    eventTime: { color: COLORS.muted, fontSize: 10, marginTop: 5 },
    eventDescription: { color: '#B8C8DB', fontSize: 11, lineHeight: 19, marginTop: 13 },
    eventDetails: { marginTop: 13, padding: 13, backgroundColor: COLORS.elevated, borderRadius: 11, borderWidth: 1, borderColor: COLORS.border },
    detailHeading: { color: COLORS.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1 },
    detailText: { color: COLORS.white, fontSize: 11, lineHeight: 19, marginTop: 9 },
    detailMeta: { color: COLORS.muted, fontSize: 10, marginTop: 10 },
    detailAction: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: COLORS.border },
    detailActionText: { color: COLORS.cyan, fontSize: 10, fontWeight: '900' },
    eventFooter: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 14, paddingTop: 11, borderTopWidth: 1, borderTopColor: COLORS.border },
    eventCrew: { color: COLORS.muted, fontSize: 10, flexShrink: 1 },
    eventKind: { fontSize: 9, fontWeight: '900' },
    moreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 16, backgroundColor: '#15384B', borderRadius: 13, marginBottom: 22 },
    moreText: { color: COLORS.cyan, fontSize: 11, fontWeight: '900' },
    actionCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: COLORS.card, borderWidth: 1, borderColor: COLORS.border, borderRadius: 14, padding: 16, marginBottom: 10 },
    actionContent: { flex: 1, marginLeft: 12 },
    actionTitle: { color: COLORS.white, fontSize: 13, fontWeight: '900' },
    actionSubtitle: { color: COLORS.muted, fontSize: 11, marginTop: 5 },
    summaryCard: { backgroundColor: COLORS.elevated, borderRadius: 14, padding: 16, marginTop: 15, marginBottom: 18 },
    summaryTitle: { color: COLORS.white, fontSize: 13, fontWeight: '900' },
    summaryText: { color: COLORS.muted, fontSize: 11, lineHeight: 19, marginTop: 9 },
    disclaimer: { flexDirection: 'row', gap: 10, backgroundColor: '#11283A', padding: 15, borderRadius: 14 },
    disclaimerText: { color: '#AFC4D6', fontSize: 11, lineHeight: 19, flex: 1 },
    footer: { color: COLORS.muted, fontSize: 9, lineHeight: 18, textAlign: 'center', marginTop: 27 },
});
