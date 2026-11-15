import React, { useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, ArrowLeft, ArrowRight, Bell, BrainCircuit, CheckCircle2, ChevronDown, ChevronRight, ClipboardList, Database, Radio, ShieldAlert, ShieldCheck, Users } from 'lucide-react-native';
import { useMissionHealth } from '../context/MissionHealthContext';
import { getSeverityColor, getSeverityLabel } from '../services/healthAlertEngine';
import { getPredictionRiskColor, getPredictionRiskLabel, predictMissionHealth } from '../services/predictiveHealthEngine';

const C = { bg: '#050B18', card: '#101D32', elevated: '#152640', border: '#263A56', cyan: '#44E4F4', purple: '#A78BFA', green: '#4ADEA3', yellow: '#FBBF24', red: '#FB7185', white: '#F4F8FF', muted: '#93A6C4' };
const CREW = [
    { id: 'CM-01', name: 'Alex Morgan', role: 'Commander', initials: 'AM', color: C.cyan },
    { id: 'CM-02', name: 'Maya Chen', role: 'Flight Engineer', initials: 'MC', color: C.purple },
    { id: 'CM-03', name: 'Jordan Lee', role: 'Mission Specialist', initials: 'JL', color: C.green },
    { id: 'CM-04', name: 'Sam Rivera', role: 'Medical Officer', initials: 'SR', color: C.yellow },
];
const OPTIONS = { horizonSteps: 5, sampleIntervalMinutes: 0.075, maxSamples: 30 };
type Filter = 'all' | 'attention';

function ScoreBar({ value, color }: { value: number; color: string }) {
    const percent = Math.max(0, Math.min(100, value));
    return <View style={s.track}><View style={[s.fill, { width: `${percent}%`, backgroundColor: color }]} /></View>;
}

function LinkRow({ title, description, color, icon, onPress }: { title: string; description: string; color: string; icon: React.ReactNode; onPress: () => void }) {
    return <TouchableOpacity onPress={onPress} activeOpacity={0.8} style={s.link}>
        <View style={[s.linkIcon, { backgroundColor: color + '18' }]}>{icon}</View>
        <View style={s.linkText}><Text style={s.linkTitle}>{title}</Text><Text style={s.linkDescription}>{description}</Text></View>
        <ChevronRight size={20} color={color} />
    </TouchableOpacity>;
}

export default function MissionReadinessScreen() {
    const router = useRouter();
    const [filter, setFilter] = useState<Filter>('all');
    const [expanded, setExpanded] = useState<string | null>(null);
    const { history, historyLoaded, assessCrew, setSelectedId, activeAlertCount } = useMissionHealth();
    const prediction = useMemo(() => predictMissionHealth(CREW.map(c => c.id), history, OPTIONS), [history]);
    const reports = CREW.map(member => {
        const assessment = assessCrew(member.id);
        const forecast = prediction.crew.find(item => item.crewId === member.id);
        const sampleCount = history.filter(item => item.crewId === member.id).length;
        const hasForecast = (forecast?.sampleCount ?? 0) >= 3 && forecast?.predictedHealthScore != null;
        const flagged = assessment.severity !== 'normal' || (hasForecast && forecast?.overallRisk !== 'low');
        return { ...member, assessment, forecast, sampleCount, hasForecast, flagged };
    });
    const meanScore = Math.round(reports.reduce((sum, item) => sum + item.assessment.score, 0) / reports.length);
    const totalAlerts = reports.reduce((sum, item) => sum + item.assessment.alerts.length, 0);
    const crewWithSamples = reports.filter(item => item.sampleCount > 0).length;
    const attentionCount = reports.filter(item => item.flagged).length;
    const coverageComplete = crewWithSamples === CREW.length;
    const forecastsComplete = prediction.analyzedCrewCount === CREW.length;
    const simulatedReadiness = Math.max(0, Math.min(100, Math.round(meanScore * 0.75 + (crewWithSamples / CREW.length) * 15 + (prediction.analyzedCrewCount / CREW.length) * 10 - attentionCount * 4)));
    const readinessColor = simulatedReadiness >= 85 ? C.green : simulatedReadiness >= 65 ? C.yellow : C.red;
    const readinessLabel = !historyLoaded ? 'Loading simulation' : !coverageComplete ? 'Collecting telemetry' : attentionCount > 0 ? 'Review required' : forecastsComplete ? 'Simulation stable' : 'Forecasts developing';
    const visibleReports = filter === 'attention' ? reports.filter(item => item.flagged) : reports;
    const missionRiskColor = prediction.analyzedCrewCount ? getPredictionRiskColor(prediction.overallRisk) : C.muted;
    const goToCrew = (id: string) => { setSelectedId(id); router.push('/analysis'); };

    return <SafeAreaView edges={['top']} style={s.root}>
        <StatusBar barStyle="light-content" />
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
            <View style={s.header}>
                <TouchableOpacity style={s.back} onPress={() => router.back()}><ArrowLeft size={21} color={C.white} /></TouchableOpacity>
                <View style={s.headerText}><Text style={s.brand}>COSMIC CARE</Text><Text style={s.pageTitle}>Mission Readiness</Text></View>
                <TouchableOpacity style={s.back} onPress={() => router.push('/alerts')}><Bell size={21} color={C.cyan} /></TouchableOpacity>
            </View>

            <LinearGradient colors={['#183E55', '#192B48', '#101D32']} style={s.hero}>
                <View style={s.heroTop}><View style={s.live}><Radio size={13} color={C.green} /><Text style={s.liveText}>SIMULATED MISSION STATUS</Text></View><Text style={s.missionId}>CC-01</Text></View>
                <Text style={s.eyebrow}>EDUCATIONAL READINESS INDEX</Text>
                <View style={s.scoreLine}><Text style={[s.bigScore, { color: readinessColor }]}>{simulatedReadiness}</Text><Text style={s.outOf}>/100</Text></View>
                <ScoreBar value={simulatedReadiness} color={readinessColor} />
                <Text style={[s.readinessLabel, { color: readinessColor }]}>{readinessLabel}</Text>
                <Text style={s.heroBody}>Illustrative score combining simulated crew health, telemetry coverage, and forecast availability. It is not a flight-readiness determination.</Text>
            </LinearGradient>

            <View style={s.tileGrid}>
                <View style={s.tile}><Text style={[s.tileValue, { color: C.cyan }]}>{meanScore}</Text><Text style={s.tileLabel}>AVG HEALTH SCORE</Text></View>
                <View style={s.tile}><Text style={[s.tileValue, { color: attentionCount ? C.yellow : C.green }]}>{attentionCount}/4</Text><Text style={s.tileLabel}>NEED REVIEW</Text></View>
                <View style={s.tile}><Text style={[s.tileValue, { color: C.purple }]}>{prediction.analyzedCrewCount}/4</Text><Text style={s.tileLabel}>FORECAST READY</Text></View>
                <View style={s.tile}><Text style={[s.tileValue, { color: C.cyan }]}>{crewWithSamples}/4</Text><Text style={s.tileLabel}>WITH SAVED DATA</Text></View>
            </View>

            <View style={s.sectionHeading}><Text style={s.sectionTitle}>Readiness Checks</Text><ShieldCheck color={C.cyan} size={21} /></View>
            <View style={s.panel}>
                <View style={s.checkRow}>{coverageComplete ? <CheckCircle2 size={20} color={C.green} /> : <Database size={20} color={C.yellow} />}<View style={s.checkBody}><Text style={s.checkTitle}>Telemetry coverage</Text><Text style={s.checkDetail}>{crewWithSamples} of 4 crew have saved samples</Text></View><Text style={[s.checkStatus, { color: coverageComplete ? C.green : C.yellow }]}>{coverageComplete ? 'Complete' : 'Pending'}</Text></View>
                <View style={s.checkRow}>{forecastsComplete ? <CheckCircle2 size={20} color={C.green} /> : <BrainCircuit size={20} color={C.purple} />}<View style={s.checkBody}><Text style={s.checkTitle}>Prediction coverage</Text><Text style={s.checkDetail}>{prediction.analyzedCrewCount} of 4 crew have forecast data</Text></View><Text style={[s.checkStatus, { color: forecastsComplete ? C.green : C.purple }]}>{forecastsComplete ? 'Complete' : 'Pending'}</Text></View>
                <View style={s.checkRow}><ShieldAlert size={20} color={totalAlerts ? C.yellow : C.green} /><View style={s.checkBody}><Text style={s.checkTitle}>Current health alerts</Text><Text style={s.checkDetail}>{totalAlerts} metric alerts across the crew</Text></View><Text style={[s.checkStatus, { color: totalAlerts ? C.yellow : C.green }]}>{totalAlerts ? 'Review' : 'Clear'}</Text></View>
                <View style={s.checkRow}><Activity size={20} color={missionRiskColor} /><View style={s.checkBody}><Text style={s.checkTitle}>Projected mission risk</Text><Text style={s.checkDetail}>{prediction.analyzedCrewCount ? getPredictionRiskLabel(prediction.overallRisk) : 'Awaiting sufficient samples'}</Text></View><Text style={[s.checkStatus, { color: missionRiskColor }]}>{prediction.analyzedCrewCount ? 'Simulated' : 'Pending'}</Text></View>
            </View>

            <View style={s.sectionHeading}><Text style={s.sectionTitle}>Crew Readiness</Text><Users size={21} color={C.purple} /></View>
            <View style={s.filters}>
                <TouchableOpacity style={[s.filter, filter === 'all' && s.activeFilter]} onPress={() => setFilter('all')}><Text style={[s.filterText, filter === 'all' && s.activeFilterText]}>All Crew ({reports.length})</Text></TouchableOpacity>
                <TouchableOpacity style={[s.filter, filter === 'attention' && s.activeFilter]} onPress={() => setFilter('attention')}><Text style={[s.filterText, filter === 'attention' && s.activeFilterText]}>Needs Review ({attentionCount})</Text></TouchableOpacity>
            </View>
            {visibleReports.length === 0 ? <View style={s.empty}><CheckCircle2 size={26} color={C.green} /><Text style={s.emptyTitle}>No crew flagged by simulation rules</Text><Text style={s.emptyBody}>This does not represent a medical clearance.</Text></View> : visibleReports.map(member => {
                const currentColor = getSeverityColor(member.assessment.severity);
                const forecastColor = member.hasForecast && member.forecast ? getPredictionRiskColor(member.forecast.overallRisk) : C.muted;
                const isExpanded = expanded === member.id;
                return <View key={member.id} style={s.crewCard}>
                    <TouchableOpacity activeOpacity={0.85} onPress={() => setExpanded(isExpanded ? null : member.id)} style={s.crewTop}>
                        <View style={[s.avatar, { backgroundColor: member.color + '20' }]}><Text style={[s.initials, { color: member.color }]}>{member.initials}</Text></View>
                        <View style={s.crewIdentity}><Text style={s.crewName}>{member.name}</Text><Text style={s.crewRole}>{member.role} · {member.id}</Text></View>
                        <ChevronDown size={19} color={C.muted} style={{ transform: [{ rotate: isExpanded ? '180deg' : '0deg' }] }} />
                    </TouchableOpacity>
                    <View style={s.crewScoreRow}><Text style={s.crewMetricLabel}>Current health score</Text><Text style={[s.crewMetricValue, { color: currentColor }]}>{member.assessment.score}/100</Text></View>
                    <ScoreBar value={member.assessment.score} color={currentColor} />
                    <View style={s.crewScoreRow}><Text style={s.crewMetricLabel}>Forecast health score</Text><Text style={[s.crewMetricValue, { color: forecastColor }]}>{member.hasForecast ? member.forecast?.predictedHealthScore : 'Awaiting Data'}</Text></View>
                    <View style={s.crewBadges}><Text style={[s.badge, { color: currentColor, backgroundColor: currentColor + '18' }]}>{getSeverityLabel(member.assessment.severity)}</Text><Text style={[s.badge, { color: forecastColor, backgroundColor: forecastColor + '18' }]}>{member.hasForecast && member.forecast ? getPredictionRiskLabel(member.forecast.overallRisk) : 'No Forecast'}</Text></View>
                    {isExpanded && <View style={s.expanded}>
                        <Text style={s.detailText}>{member.assessment.summary}</Text>
                        <Text style={s.detailLine}>Saved samples: {member.sampleCount}</Text>
                        <Text style={s.detailLine}>Current metric alerts: {member.assessment.alerts.length}</Text>
                        <Text style={s.detailLine}>Forecast confidence: {member.hasForecast ? member.forecast?.confidence : 'Insufficient data'}</Text>
                        <TouchableOpacity style={s.detailAction} onPress={() => goToCrew(member.id)}><Text style={s.detailActionText}>OPEN CREW ANALYTICS</Text><ArrowRight size={16} color={C.cyan} /></TouchableOpacity>
                    </View>}
                </View>;
            })}

            <View style={s.sectionHeading}><Text style={s.sectionTitle}>Mission Control</Text><ClipboardList size={21} color={C.cyan} /></View>
            <LinkRow title="Mission Health Report" description="Detailed crew health comparisons" color={C.cyan} icon={<ClipboardList size={22} color={C.cyan} />} onPress={() => router.push('/missionreport')} />
            <LinkRow title="Mission Event Log" description="Review simulated events and warnings" color={C.yellow} icon={<Radio size={22} color={C.yellow} />} onPress={() => router.push('/missionevents')} />
            <LinkRow title="Predictive Analytics" description="Inspect mathematical crew forecasts" color={C.purple} icon={<BrainCircuit size={22} color={C.purple} />} onPress={() => router.push('/analysis')} />
            <LinkRow title="Mission Overview" description="Compare all astronaut vital signs" color={C.green} icon={<Users size={22} color={C.green} />} onPress={() => router.push('/missionoverview')} />
            <View style={s.disclaimer}><ShieldAlert color={C.cyan} size={20} /><Text style={s.disclaimerText}>Cosmic Care uses fictional astronaut telemetry and simplified mathematical predictions. Readiness scores, alerts, and recommendations are educational only and are not validated for medical, flight, or mission-critical decisions. Current app alert count: {activeAlertCount}.</Text></View>
            <Text style={s.footer}>COSMIC CARE · MISSION CC-01 · EDUCATIONAL SIMULATION</Text>
        </ScrollView>
    </SafeAreaView>;
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    content: { paddingHorizontal: 19, paddingTop: 14, paddingBottom: 55 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 24, gap: 12 },
    back: { width: 42, height: 42, borderRadius: 13, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
    headerText: { flex: 1 }, brand: { color: C.cyan, fontSize: 10, fontWeight: '900', letterSpacing: 1.5 },
    pageTitle: { color: C.white, fontSize: 22, fontWeight: '900', marginTop: 4 },
    hero: { padding: 21, borderRadius: 21, borderWidth: 1, borderColor: '#2C5771', marginBottom: 16 },
    heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
    live: { flexDirection: 'row', alignItems: 'center', gap: 7, paddingHorizontal: 10, paddingVertical: 7, borderRadius: 20, backgroundColor: '#1B4446' },
    liveText: { color: C.green, fontSize: 9, fontWeight: '900' }, missionId: { color: C.cyan, fontWeight: '900', fontSize: 11 },
    eyebrow: { color: C.muted, fontSize: 10, fontWeight: '800', letterSpacing: 1.1, marginTop: 24 },
    scoreLine: { flexDirection: 'row', alignItems: 'baseline', marginTop: 7, marginBottom: 12 },
    bigScore: { fontSize: 58, fontWeight: '900' }, outOf: { color: C.muted, fontSize: 18, marginLeft: 4 },
    readinessLabel: { fontSize: 15, fontWeight: '900', marginTop: 16 }, heroBody: { color: '#BDD1E3', fontSize: 12, lineHeight: 20, marginTop: 10 },
    track: { height: 8, backgroundColor: '#293950', borderRadius: 5, overflow: 'hidden' }, fill: { height: '100%', borderRadius: 5 },
    tileGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 10 },
    tile: { width: '48%', padding: 16, borderRadius: 15, backgroundColor: C.card, borderColor: C.border, borderWidth: 1, marginBottom: 11 },
    tileValue: { fontSize: 26, fontWeight: '900' }, tileLabel: { color: C.muted, fontSize: 9, fontWeight: '800', marginTop: 9 },
    sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 18, marginBottom: 14 },
    sectionTitle: { color: C.white, fontSize: 19, fontWeight: '900' },
    panel: { borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 17, paddingHorizontal: 15 },
    checkRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 17, borderBottomWidth: 1, borderBottomColor: C.border, gap: 11 },
    checkBody: { flex: 1 }, checkTitle: { color: C.white, fontSize: 12, fontWeight: '800' }, checkDetail: { color: C.muted, fontSize: 10, marginTop: 5 },
    checkStatus: { fontSize: 10, fontWeight: '900' },
    filters: { flexDirection: 'row', gap: 9, marginBottom: 13 },
    filter: { paddingHorizontal: 13, paddingVertical: 11, borderRadius: 11, borderWidth: 1, borderColor: C.border, backgroundColor: C.card },
    activeFilter: { borderColor: C.cyan, backgroundColor: '#15364B' }, filterText: { color: C.muted, fontSize: 11, fontWeight: '800' }, activeFilterText: { color: C.cyan },
    crewCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 16, marginBottom: 12 },
    crewTop: { flexDirection: 'row', alignItems: 'center', marginBottom: 19 },
    avatar: { width: 43, height: 43, borderRadius: 13, alignItems: 'center', justifyContent: 'center' }, initials: { fontWeight: '900', fontSize: 13 },
    crewIdentity: { flex: 1, marginLeft: 11 }, crewName: { color: C.white, fontSize: 14, fontWeight: '900' }, crewRole: { color: C.muted, fontSize: 10, marginTop: 5 },
    crewScoreRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10, marginTop: 9 },
    crewMetricLabel: { color: C.muted, fontSize: 11 }, crewMetricValue: { fontSize: 12, fontWeight: '900' },
    crewBadges: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 14 }, badge: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9, fontSize: 10, fontWeight: '900' },
    expanded: { marginTop: 16, paddingTop: 15, borderTopWidth: 1, borderTopColor: C.border },
    detailText: { color: C.white, fontSize: 12, lineHeight: 19 }, detailLine: { color: C.muted, fontSize: 11, marginTop: 9 },
    detailAction: { marginTop: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }, detailActionText: { color: C.cyan, fontSize: 11, fontWeight: '900' },
    empty: { padding: 24, borderRadius: 16, backgroundColor: C.card, alignItems: 'center', gap: 9 },
    emptyTitle: { color: C.white, fontWeight: '800', fontSize: 12, textAlign: 'center' }, emptyBody: { color: C.muted, fontSize: 11, textAlign: 'center' },
    link: { flexDirection: 'row', alignItems: 'center', padding: 14, borderRadius: 15, backgroundColor: C.card, borderWidth: 1, borderColor: C.border, marginBottom: 10 },
    linkIcon: { width: 43, height: 43, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    linkText: { flex: 1, marginLeft: 12 }, linkTitle: { color: C.white, fontSize: 13, fontWeight: '900' }, linkDescription: { color: C.muted, fontSize: 10, marginTop: 5 },
    disclaimer: { flexDirection: 'row', gap: 11, padding: 15, backgroundColor: '#11283A', borderRadius: 14, marginTop: 18 },
    disclaimerText: { flex: 1, color: '#B4C7D8', fontSize: 11, lineHeight: 19 },
    footer: { textAlign: 'center', color: C.muted, fontSize: 9, marginTop: 27 },
});
