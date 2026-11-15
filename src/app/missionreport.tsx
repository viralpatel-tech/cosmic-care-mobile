import React, { useMemo, useState } from 'react';
import { ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Activity, ArrowLeft, ArrowRight, Bell, BrainCircuit, CalendarClock, ChevronRight, ClipboardList, Database, HeartPulse, Info, Radio, ShieldAlert, ShieldCheck, Users } from 'lucide-react-native';
import { useMissionHealth } from '../context/MissionHealthContext';
import { getSeverityColor, getSeverityLabel } from '../services/healthAlertEngine';
import { getPredictionRiskColor, getPredictionRiskLabel, predictMissionHealth } from '../services/predictiveHealthEngine';

const C = {
    bg: '#050B18', card: '#101D32', elevated: '#152640', border: '#263A56',
    cyan: '#44E4F4', purple: '#A78BFA', green: '#4ADEA3', yellow: '#FBBF24',
    red: '#FB7185', white: '#F4F8FF', muted: '#93A6C4',
};

const CREW = [
    { id: 'CM-01', name: 'Alex Morgan', role: 'Commander', initials: 'AM', color: C.cyan },
    { id: 'CM-02', name: 'Maya Chen', role: 'Flight Engineer', initials: 'MC', color: C.purple },
    { id: 'CM-03', name: 'Jordan Lee', role: 'Mission Specialist', initials: 'JL', color: C.green },
    { id: 'CM-04', name: 'Sam Rivera', role: 'Medical Officer', initials: 'SR', color: C.yellow },
];

function SectionTitle({ title, detail }: { title: string; detail?: string }) {
    return (
        <View style={s.sectionHeading}>
            <Text style={s.sectionTitle}>{title}</Text>
            {detail ? <Text style={s.sectionDetail}>{detail}</Text> : null}
        </View>
    );
}

function SummaryTile({ label, value, color }: { label: string; value: string | number; color: string }) {
    return (
        <View style={s.summaryTile}>
            <Text style={[s.summaryValue, { color }]}>{value}</Text>
            <Text style={s.summaryLabel}>{label}</Text>
        </View>
    );
}

function LinkRow({ title, subtitle, color, icon, onPress }: {
    title: string; subtitle: string; color: string; icon: React.ReactNode; onPress: () => void;
}) {
    return (
        <TouchableOpacity style={s.linkRow} onPress={onPress} activeOpacity={0.8}>
            <View style={[s.linkIcon, { backgroundColor: color + '1A' }]}>{icon}</View>
            <View style={s.linkBody}>
                <Text style={s.linkTitle}>{title}</Text>
                <Text style={s.linkSubtitle}>{subtitle}</Text>
            </View>
            <ChevronRight size={19} color={color} />
        </TouchableOpacity>
    );
}

export default function MissionReportScreen() {
    const router = useRouter();
    const [sortBy, setSortBy] = useState<'crew' | 'score' | 'risk'>('crew');
    const { history, historyLoaded, assessCrew, setSelectedId } = useMissionHealth();

    const prediction = useMemo(
        () => predictMissionHealth(CREW.map(member => member.id), history, {
            horizonSteps: 5,
            sampleIntervalMinutes: 0.075,
            maxSamples: 30,
        }),
        [history]
    );

    const crewReports = CREW.map(member => {
        const assessment = assessCrew(member.id);
        const forecast = prediction.crew.find(item => item.crewId === member.id);
        const samples = history.filter(item => item.crewId === member.id);
        const hasForecast = forecast?.predictedHealthScore !== null && forecast?.predictedHealthScore !== undefined && (forecast?.sampleCount ?? 0) >= 3;
        return { ...member, assessment, forecast, samples, hasForecast };
    });

    const sortedCrewReports = [...crewReports].sort((a, b) => {
        if (sortBy === 'score') return a.assessment.score - b.assessment.score;
        if (sortBy === 'risk') {
            const riskOrder = { critical: 4, high: 3, elevated: 2, low: 1 };
            const aRisk = a.hasForecast && a.forecast ? riskOrder[a.forecast.overallRisk] : 0;
            const bRisk = b.hasForecast && b.forecast ? riskOrder[b.forecast.overallRisk] : 0;
            return bRisk - aRisk || a.assessment.score - b.assessment.score;
        }
        return a.id.localeCompare(b.id);
    });

    const totalAlerts = crewReports.reduce((sum, member) => sum + member.assessment.alerts.length, 0);
    const averageCurrentScore = Math.round(crewReports.reduce((sum, member) => sum + member.assessment.score, 0) / CREW.length);
    const analyzed = prediction.analyzedCrewCount;
    const missionRiskColor = analyzed > 0 ? getPredictionRiskColor(prediction.overallRisk) : C.muted;
    const flagged = prediction.flaggedCrewIds.length;
    const latest = history.reduce<string | null>((current, item) => {
        if (!current || Date.parse(item.timestamp) > Date.parse(current)) return item.timestamp;
        return current;
    }, null);

    const openCrew = (id: string) => {
        setSelectedId(id);
        router.push('/analysis');
    };

    return (
        <SafeAreaView style={s.root} edges={['top']}>
            <StatusBar barStyle="light-content" />
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={s.content}>
                <View style={s.header}>
                    <TouchableOpacity style={s.back} onPress={() => router.replace('/')}>
                        <ArrowLeft size={21} color={C.white} />
                    </TouchableOpacity>
                    <View style={s.headerText}>
                        <Text style={s.brand}>✦ COSMIC CARE</Text>
                        <Text style={s.headerSub}>MISSION INTELLIGENCE REPORT</Text>
                    </View>
                    <View style={s.headerIcon}><ClipboardList size={22} color={C.cyan} /></View>
                </View>

                <LinearGradient colors={['#1B3B58', '#1A2949', '#101D32']} style={s.hero}>
                    <View style={s.heroTop}>
                        <View style={s.livePill}><Radio size={14} color={C.green} /><Text style={s.liveText}>SIMULATION REPORT</Text></View>
                        <Text style={s.heroCode}>CC-01</Text>
                    </View>
                    <View style={s.heroSymbol}><HeartPulse size={30} color={C.cyan} /></View>
                    <Text style={s.heroTitle}>Mission Health Report</Text>
                    <Text style={s.heroDescription}>A consolidated view of fictional crew health assessments, telemetry coverage, and mathematical risk forecasts.</Text>
                    <View style={s.heroRule} />
                    <View style={s.heroNumbers}>
                        <View><Text style={s.heroNumber}>04</Text><Text style={s.heroLabel}>CREW</Text></View>
                        <View><Text style={s.heroNumber}>{history.length}</Text><Text style={s.heroLabel}>SAVED SAMPLES</Text></View>
                        <View><Text style={s.heroNumber}>{analyzed}/4</Text><Text style={s.heroLabel}>FORECAST READY</Text></View>
                    </View>
                </LinearGradient>

                <SectionTitle title="Mission Summary" detail="Current simulation" />
                <View style={s.summaryGrid}>
                    <SummaryTile label="AVG HEALTH SCORE" value={`${averageCurrentScore}/100`} color={C.cyan} />
                    <SummaryTile label="ACTIVE METRIC ALERTS" value={totalAlerts} color={totalAlerts ? C.yellow : C.green} />
                    <SummaryTile label="FLAGGED FORECASTS" value={analyzed ? flagged : '--'} color={flagged ? C.red : C.muted} />
                    <SummaryTile label="PROJECTED AVG SCORE" value={prediction.averagePredictedScore === null ? '--' : `${prediction.averagePredictedScore}/100`} color={C.purple} />
                </View>

                <View style={s.riskCard}>
                    <View style={[s.riskIcon, { backgroundColor: missionRiskColor + '1A' }]}>
                        {flagged ? <ShieldAlert size={24} color={missionRiskColor} /> : <ShieldCheck size={24} color={missionRiskColor} />}
                    </View>
                    <View style={s.riskBody}>
                        <Text style={s.eyebrow}>MISSION FORECAST STATUS</Text>
                        <Text style={[s.riskTitle, { color: missionRiskColor }]}>{analyzed ? getPredictionRiskLabel(prediction.overallRisk) : 'Awaiting Data'}</Text>
                        <Text style={s.riskDescription}>{analyzed ? prediction.summary : 'Forecasts require at least three saved telemetry readings per astronaut.'}</Text>
                    </View>
                </View>

                <SectionTitle title="Crew Health Comparison" detail="Current simulation" />
                <View style={s.comparisonCard}>
                    {crewReports.map(member => {
                        const color = getSeverityColor(member.assessment.severity);
                        const current = Math.max(0, Math.min(100, member.assessment.score));
                        const projected = member.hasForecast && member.forecast ? member.forecast.predictedHealthScore : null;
                        const delta = projected === null || projected === undefined ? null : projected - member.assessment.score;
                        return (
                            <TouchableOpacity key={member.id} style={s.comparisonRow} onPress={() => openCrew(member.id)} activeOpacity={0.8}>
                                <View style={s.comparisonTop}>
                                    <View style={s.comparisonIdentity}>
                                        <View style={[s.comparisonDot, { backgroundColor: member.color }]} />
                                        <Text style={s.comparisonName}>{member.name}</Text>
                                    </View>
                                    <Text style={s.comparisonScore}>{member.assessment.score}/100</Text>
                                </View>
                                <View style={s.comparisonTrack}>
                                    <View style={[s.comparisonFill, { width: `${current}%`, backgroundColor: color }]} />
                                </View>
                                <Text style={s.comparisonForecast}>
                                    {projected === null || projected === undefined
                                        ? 'Forecast awaiting 3 saved samples'
                                        : `Projected ${projected}/100  ·  ${delta === null ? 'No change' : delta > 0 ? `+${delta} points` : `${delta} points`}`}
                                </Text>
                            </TouchableOpacity>
                        );
                    })}
                </View>

                <SectionTitle title="Astronaut Reports" detail="Sort by" />
                <View style={s.sortRow}>
                    {([
                        { key: 'crew', label: 'Crew order' },
                        { key: 'score', label: 'Lowest score' },
                        { key: 'risk', label: 'Highest risk' },
                    ] as const).map(option => (
                        <TouchableOpacity
                            key={option.key}
                            style={[s.sortButton, sortBy === option.key && s.sortButtonActive]}
                            onPress={() => setSortBy(option.key)}
                        >
                            <Text style={[s.sortText, sortBy === option.key && s.sortTextActive]}>{option.label}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {sortedCrewReports.map(member => {
                    const severityColor = getSeverityColor(member.assessment.severity);
                    const forecastColor = member.hasForecast && member.forecast ? getPredictionRiskColor(member.forecast.overallRisk) : C.muted;
                    return (
                        <TouchableOpacity key={member.id} style={s.crewCard} onPress={() => openCrew(member.id)} activeOpacity={0.8}>
                            <View style={s.crewTop}>
                                <View style={[s.avatar, { backgroundColor: member.color + '1B' }]}><Text style={[s.initials, { color: member.color }]}>{member.initials}</Text></View>
                                <View style={s.crewIdentity}>
                                    <Text style={s.crewName}>{member.name}</Text>
                                    <Text style={s.crewRole}>{member.role} · {member.id}</Text>
                                </View>
                                <ChevronRight size={19} color={member.color} />
                            </View>
                            <View style={s.crewDivider} />
                            <View style={s.crewStats}>
                                <View style={s.crewStat}>
                                    <Text style={s.eyebrow}>CURRENT SCORE</Text>
                                    <Text style={s.crewStatValue}>{member.assessment.score}<Text style={s.scoreSuffix}>/100</Text></Text>
                                </View>
                                <View style={s.crewStat}>
                                    <Text style={s.eyebrow}>FORECAST SCORE</Text>
                                    <Text style={[s.crewStatValue, { color: C.purple }]}>{member.hasForecast ? member.forecast?.predictedHealthScore : '--'}</Text>
                                </View>
                                <View style={s.crewStat}>
                                    <Text style={s.eyebrow}>SAMPLES</Text>
                                    <Text style={s.crewStatValue}>{member.samples.length}</Text>
                                </View>
                            </View>
                            <View style={s.crewBadges}>
                                <View style={[s.pill, { backgroundColor: severityColor + '19' }]}><Text style={[s.pillText, { color: severityColor }]}>{getSeverityLabel(member.assessment.severity)}</Text></View>
                                <View style={[s.pill, { backgroundColor: forecastColor + '19' }]}><Text style={[s.pillText, { color: forecastColor }]}>{member.hasForecast && member.forecast ? `${getPredictionRiskLabel(member.forecast.overallRisk)} forecast` : 'Awaiting forecast'}</Text></View>
                            </View>
                            <Text style={s.crewNote}>{member.assessment.summary}</Text>
                            <View style={s.crewFooter}>
                                <Text style={s.crewFooterText}>{member.assessment.alerts.length} current metric alerts</Text>
                                <Text style={s.crewFooterLink}>VIEW CREW ANALYSIS  →</Text>
                            </View>
                        </TouchableOpacity>
                    );
                })}

                <SectionTitle title="Mission Intelligence Summary" />
                <View style={s.insightsCard}>
                    <View style={s.insightsHeading}><BrainCircuit size={22} color={C.purple} /><Text style={s.insightsTitle}>Simulation Insights</Text></View>
                    <Text style={s.insightLine}>• {analyzed} of 4 astronauts have enough saved samples for mathematical forecasting.</Text>
                    <Text style={s.insightLine}>• {totalAlerts === 0 ? 'No active metric alerts in the current simulation.' : `${totalAlerts} active metric alerts across the crew.`}</Text>
                    <Text style={s.insightLine}>• {analyzed === 0 ? 'Mission forecast risk is not yet available.' : `${flagged} crew members are flagged by the simulated forecast model.`}</Text>
                    <Text style={s.insightLine}>• {prediction.averagePredictedScore === null ? 'Projected average score will appear when sufficient telemetry is saved.' : `Predicted mission average health score: ${prediction.averagePredictedScore}/100.`}</Text>
                </View>

                <SectionTitle title="Telemetry Coverage" />
                <View style={s.coverageCard}>
                    <View style={s.coverageRow}><Database size={19} color={C.cyan} /><Text style={s.coverageLabel}>Saved telemetry records</Text><Text style={s.coverageValue}>{historyLoaded ? history.length : 'Loading'}</Text></View>
                    <View style={s.coverageLine} />
                    <View style={s.coverageRow}><Users size={19} color={C.green} /><Text style={s.coverageLabel}>Astronauts with 3+ samples</Text><Text style={s.coverageValue}>{crewReports.filter(member => member.samples.length >= 3).length}/4</Text></View>
                    <View style={s.coverageLine} />
                    <View style={s.coverageRow}><CalendarClock size={19} color={C.purple} /><Text style={s.coverageLabel}>Latest saved reading</Text><Text style={s.coverageValue}>{latest ? new Date(latest).toLocaleString() : 'None'}</Text></View>
                </View>

                <SectionTitle title="Mission Control" />
                <LinkRow title="Mission Predictive Overview" subtitle="Compare forecasts for all four astronauts" color={C.green} icon={<Users size={21} color={C.green} />} onPress={() => router.push('/missionoverview')} />
                <LinkRow title="Mission Event Log" subtitle="Review reconstructed simulation events" color={C.yellow} icon={<CalendarClock size={21} color={C.yellow} />} onPress={() => router.push('/missionevents')} />
                <LinkRow title="Predictive Analytics" subtitle="Explore detailed trend projections" color={C.purple} icon={<BrainCircuit size={21} color={C.purple} />} onPress={() => router.push('/analysis')} />
                <LinkRow title="Mission Alerts" subtitle="Inspect simulated alert conditions" color={C.red} icon={<Bell size={21} color={C.red} />} onPress={() => router.push('/alerts')} />
                <LinkRow title="Telemetry History" subtitle="Review stored biometric samples" color={C.cyan} icon={<Activity size={21} color={C.cyan} />} onPress={() => router.push('/history')} />

                <View style={s.disclaimer}><Info size={19} color={C.cyan} /><Text style={s.disclaimerText}>Cosmic Care is an educational demonstration. All crew data is fictional, and all health scores, alerts, and forecasts are illustrative—not validated medical predictions or medical advice.</Text></View>
                <View style={s.footer}><Text style={s.footerText}>COSMIC CARE · CC-01 · MISSION HEALTH INTELLIGENCE</Text><ArrowRight size={14} color={C.muted} /></View>
            </ScrollView>
        </SafeAreaView>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    comparisonCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 17, padding: 16, marginBottom: 23 },
    comparisonRow: { paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: C.border },
    comparisonTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 11 },
    comparisonIdentity: { flexDirection: 'row', alignItems: 'center', flex: 1 },
    comparisonDot: { width: 9, height: 9, borderRadius: 5, marginRight: 10 },
    comparisonName: { color: C.white, fontSize: 12, fontWeight: '800' },
    comparisonScore: { color: C.white, fontSize: 13, fontWeight: '900' },
    comparisonTrack: { height: 8, borderRadius: 5, backgroundColor: C.elevated, overflow: 'hidden' },
    comparisonFill: { height: '100%', borderRadius: 5 },
    comparisonForecast: { color: C.muted, fontSize: 10, marginTop: 8 },
    sortRow: { flexDirection: 'row', gap: 7, marginBottom: 15 },
    sortButton: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 11, paddingHorizontal: 5, borderWidth: 1, borderColor: C.border, backgroundColor: C.card, borderRadius: 11 },
    sortButtonActive: { borderColor: C.cyan, backgroundColor: '#17384D' },
    sortText: { color: C.muted, fontSize: 10, fontWeight: '700' },
    sortTextActive: { color: C.cyan },
    crewFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 13, paddingTop: 12, borderTopWidth: 1, borderTopColor: C.border },
    crewFooterText: { color: C.muted, fontSize: 10 },
    crewFooterLink: { color: C.cyan, fontSize: 9, fontWeight: '900' },
    insightsCard: { backgroundColor: C.card, borderColor: C.border, borderWidth: 1, borderRadius: 17, padding: 17, marginBottom: 24 },
    insightsHeading: { flexDirection: 'row', alignItems: 'center', gap: 9, marginBottom: 12 },
    insightsTitle: { color: C.white, fontSize: 15, fontWeight: '900' },
    insightLine: { color: '#B8C8DB', fontSize: 11, lineHeight: 20, marginBottom: 8 },
    content: { paddingHorizontal: 20, paddingTop: 18, paddingBottom: 55 },
    header: { flexDirection: 'row', alignItems: 'center', marginBottom: 23 },
    back: { width: 44, height: 44, borderRadius: 13, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
    headerText: { flex: 1, marginLeft: 12 },
    brand: { color: C.cyan, fontSize: 16, fontWeight: '900', letterSpacing: 1 },
    headerSub: { color: C.muted, fontSize: 9, letterSpacing: 1, marginTop: 5 },
    headerIcon: { width: 43, height: 43, borderRadius: 13, backgroundColor: C.card, alignItems: 'center', justifyContent: 'center' },
    hero: { borderRadius: 22, borderWidth: 1, borderColor: '#315A79', padding: 20, marginBottom: 24 },
    heroTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    livePill: { flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: '#194344', paddingHorizontal: 11, paddingVertical: 8, borderRadius: 20 },
    liveText: { color: C.green, fontSize: 9, fontWeight: '900' },
    heroCode: { color: C.cyan, fontSize: 11, fontWeight: '900' },
    heroSymbol: { width: 65, height: 65, borderRadius: 19, backgroundColor: '#23445A', alignItems: 'center', justifyContent: 'center', marginTop: 25 },
    heroTitle: { color: C.white, fontSize: 26, fontWeight: '900', marginTop: 17 },
    heroDescription: { color: '#B9CDE0', fontSize: 12, lineHeight: 21, marginTop: 10 },
    heroRule: { height: 1, backgroundColor: '#365470', marginVertical: 21 },
    heroNumbers: { flexDirection: 'row', justifyContent: 'space-between' },
    heroNumber: { color: C.white, fontSize: 22, fontWeight: '900' },
    heroLabel: { color: C.muted, fontSize: 9, marginTop: 7 },
    sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, marginBottom: 14 },
    sectionTitle: { color: C.white, fontSize: 19, fontWeight: '900' },
    sectionDetail: { color: C.muted, fontSize: 11 },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', marginBottom: 13 },
    summaryTile: { width: '48%', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 15, padding: 17, marginBottom: 12 },
    summaryValue: { color: C.white, fontSize: 25, fontWeight: '900' },
    summaryLabel: { color: C.muted, fontSize: 9, fontWeight: '800', marginTop: 9 },
    riskCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 17, flexDirection: 'row', marginBottom: 24 },
    riskIcon: { width: 48, height: 48, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
    riskBody: { flex: 1, marginLeft: 12 },
    eyebrow: { color: C.muted, fontSize: 9, fontWeight: '800' },
    riskTitle: { fontSize: 17, fontWeight: '900', marginTop: 7 },
    riskDescription: { color: '#B8C8DB', fontSize: 11, lineHeight: 19, marginTop: 9 },
    crewCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 17, padding: 17, marginBottom: 12 },
    crewTop: { flexDirection: 'row', alignItems: 'center' },
    avatar: { width: 45, height: 45, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
    initials: { fontSize: 14, fontWeight: '900' },
    crewIdentity: { flex: 1, marginLeft: 12 },
    crewName: { color: C.white, fontSize: 14, fontWeight: '900' },
    crewRole: { color: C.muted, fontSize: 11, marginTop: 5 },
    crewDivider: { height: 1, backgroundColor: C.border, marginVertical: 16 },
    crewStats: { flexDirection: 'row', justifyContent: 'space-between' },
    crewStat: { alignItems: 'flex-start' },
    crewStatValue: { color: C.white, fontSize: 21, fontWeight: '900', marginTop: 7 },
    scoreSuffix: { color: C.muted, fontSize: 11 },
    crewBadges: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 17 },
    pill: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 9 },
    pillText: { fontSize: 10, fontWeight: '900' },
    crewNote: { color: '#B8C8DB', fontSize: 11, lineHeight: 19, marginTop: 14 },
    coverageCard: { backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 16, padding: 17, marginBottom: 24 },
    coverageRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 6 },
    coverageLabel: { color: C.muted, fontSize: 11, flex: 1 },
    coverageValue: { color: C.white, fontSize: 11, fontWeight: '900', maxWidth: 125, textAlign: 'right' },
    coverageLine: { height: 1, backgroundColor: C.border, marginVertical: 11 },
    linkRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.card, borderWidth: 1, borderColor: C.border, borderRadius: 15, padding: 14, marginBottom: 11 },
    linkIcon: { width: 43, height: 43, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
    linkBody: { flex: 1, marginLeft: 12 },
    linkTitle: { color: C.white, fontSize: 13, fontWeight: '900' },
    linkSubtitle: { color: C.muted, fontSize: 11, marginTop: 5 },
    disclaimer: { flexDirection: 'row', alignItems: 'flex-start', gap: 11, backgroundColor: '#11283A', borderRadius: 14, padding: 15, marginTop: 14 },
    disclaimerText: { flex: 1, color: '#AFC4D6', fontSize: 11, lineHeight: 19 },
    footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 27 },
    footerText: { color: C.muted, fontSize: 9, textAlign: 'center' },
});
