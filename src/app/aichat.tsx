import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Linking, StatusBar } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, BrainCircuit, ChevronDown, ChevronUp, ExternalLink, BookOpen } from 'lucide-react-native';

const QUESTIONS = [
    { question: 'How does microgravity affect the cardiovascular system?', answer: 'In microgravity, body fluids shift toward the head and the cardiovascular system adapts to reduced gravitational loading. NASA studies these changes and their implications for astronaut health and return to Earth.', source: 'NASA — Human Spaceflight Risks', url: 'https://www.nasa.gov/hrp/risks/' },
    { question: 'Why is astronaut sleep important?', answer: 'Sleep supports alertness, cognitive performance, and health. NASA investigates how spaceflight schedules, lighting, and the environment can affect astronaut sleep.', source: 'NASA — Human Spaceflight Risks', url: 'https://www.nasa.gov/hrp/risks/' },
    { question: 'How can disrupted sleep affect mission performance?', answer: 'Insufficient sleep and circadian disruption can impair attention and performance. NASA investigates countermeasures such as lighting and scheduling to support crews.', source: 'NASA — Human Spaceflight Risks', url: 'https://www.nasa.gov/hrp/risks/' },
    { question: 'Why does NASA monitor astronaut health during long missions?', answer: 'Long-duration spaceflight can affect multiple body systems. NASA research helps characterize risks and evaluate countermeasures for future missions.', source: 'NASA — CIPHER', url: 'https://www.nasa.gov/about-cipher/' },
    { question: "What is NASA’s Human Research Program?", answer: 'NASA’s Human Research Program investigates risks to human health and performance during spaceflight and develops knowledge and countermeasures for exploration.', source: 'NASA — Human Spaceflight Risks', url: 'https://www.nasa.gov/hrp/risks/' },
    { question: "What is NASA’s Open Science Data Repository?", answer: 'NASA’s Open Science Data Repository makes space biology and related research datasets discoverable and accessible. Cosmic Care references this resource; it does not claim to have analyzed a NASA dataset.', source: 'NASA — OSDR', url: 'https://science.nasa.gov/biological-physical/data/osdr/' },
];

export default function AIChatScreen() {
    const router = useRouter();
    const [selected, setSelected] = useState<number | null>(null);
    return (
        <SafeAreaView style={styles.root} edges={['top']}>
            <StatusBar barStyle="light-content" />
            <View style={styles.header}>
                <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityLabel="Go back"><ArrowLeft color="#FFFFFF" size={22} /></TouchableOpacity>
                <View style={{ flex: 1 }}><Text style={styles.brand}>COSMIC CARE</Text><Text style={styles.subhead}>NASA RESEARCH Q&A</Text></View>
                <BrainCircuit color="#67E8F9" size={27} />
            </View>
            <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
                <View style={styles.hero}>
                    <BookOpen color="#67E8F9" size={35} />
                    <Text style={styles.heroTitle}>Space Health Research Assistant</Text>
                    <Text style={styles.heroText}>Explore six predefined questions about published NASA research.</Text>
                    <Text style={styles.heroTag}>SELECTED TOPICS • PREWRITTEN ANSWERS</Text>
                </View>
                <Text style={styles.sectionTitle}>Select a Research Question</Text>
                {QUESTIONS.map((item, index) => {
                    const expanded = selected === index;
                    return (
                        <View key={index} style={styles.card}>
                            <TouchableOpacity style={styles.questionRow} onPress={() => setSelected(expanded ? null : index)} accessibilityRole="button">
                                <Text style={styles.number}>{String(index + 1).padStart(2, '0')}</Text>
                                <Text style={styles.question}>{item.question}</Text>
                                {expanded ? <ChevronUp color="#67E8F9" size={20} /> : <ChevronDown color="#67E8F9" size={20} />}
                            </TouchableOpacity>
                            {expanded && (
                                <View style={styles.answerSection}>
                                    <Text style={styles.answerLabel}>NASA RESEARCH SUMMARY</Text>
                                    <Text style={styles.answer}>{item.answer}</Text>
                                    <TouchableOpacity style={styles.sourceButton} onPress={() => Linking.openURL(item.url)} accessibilityRole="link">
                                        <ExternalLink color="#67E8F9" size={16} />
                                        <Text style={styles.sourceText}>{item.source}</Text>
                                    </TouchableOpacity>
                                </View>
                            )}
                        </View>
                    );
                })}
                <View style={styles.notice}><Text style={styles.noticeText}>RESEARCH NOTICE{'\n\n'}These are brief educational summaries of NASA research topics, not live AI-generated answers. Cosmic Care is an independent simulation, not an official NASA product or a medical decision-support system.</Text></View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#050B18' },
    header: { flexDirection: 'row', alignItems: 'center', gap: 14, padding: 18, borderBottomWidth: 1, borderBottomColor: '#263A56' },
    back: { backgroundColor: '#152640', padding: 11, borderRadius: 12 },
    brand: { color: '#67E8F9', fontWeight: '900', letterSpacing: 2, fontSize: 15 },
    subhead: { color: '#93A6C4', fontSize: 10, letterSpacing: 1.5, marginTop: 5 },
    content: { padding: 18, paddingBottom: 60 },
    hero: { backgroundColor: '#132640', borderColor: '#315B75', borderWidth: 1, borderRadius: 20, padding: 22, marginBottom: 25, alignItems: 'center' },
    heroTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', textAlign: 'center', marginTop: 15 },
    heroText: { color: '#B8C8DB', textAlign: 'center', lineHeight: 21, marginTop: 12 },
    heroTag: { color: '#67E8F9', fontSize: 10, letterSpacing: 1, marginTop: 17, textAlign: 'center' },
    sectionTitle: { color: '#FFFFFF', fontSize: 18, fontWeight: '900', marginBottom: 16 },
    card: { backgroundColor: '#101D32', borderWidth: 1, borderColor: '#263A56', borderRadius: 15, marginBottom: 12, overflow: 'hidden' },
    questionRow: { flexDirection: 'row', alignItems: 'center', padding: 17, gap: 12 },
    number: { color: '#67E8F9', fontSize: 13, fontWeight: '900' },
    question: { flex: 1, color: '#F4F8FF', fontSize: 13, fontWeight: '700', lineHeight: 20 },
    answerSection: { borderTopWidth: 1, borderTopColor: '#263A56', padding: 17, backgroundColor: '#14243A' },
    answerLabel: { color: '#67E8F9', fontSize: 10, fontWeight: '900', letterSpacing: 1, marginBottom: 12 },
    answer: { color: '#D1DDED', fontSize: 13, lineHeight: 22 },
    sourceButton: { flexDirection: 'row', alignItems: 'center', gap: 9, marginTop: 18 },
    sourceText: { color: '#67E8F9', fontSize: 12, fontWeight: '700', flexShrink: 1 },
    notice: { backgroundColor: '#10283A', padding: 18, borderRadius: 14, marginTop: 18 },
    noticeText: { color: '#AFC4D6', fontSize: 11, lineHeight: 19 },
});
