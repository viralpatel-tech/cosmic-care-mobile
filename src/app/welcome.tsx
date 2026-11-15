
import React, { useEffect, useRef, useState } from 'react';
import {
    View,
    Text,
    Pressable,
    Animated,
    StyleSheet,
    SafeAreaView,
    StatusBar,
    useWindowDimensions,
} from 'react-native';
import { router } from 'expo-router';

// NASA-inspired visual language; this is an independent Space Apps project.
const STARS = Array.from({ length: 34 }, (_, i) => ({
    left: `${(i * 37 + 13) % 96}%` as const,
    top: `${(i * 29 + 7) % 92}%` as const,
    size: i % 5 === 0 ? 3 : 2,
    opacity: i % 4 === 0 ? 0.8 : 0.35,
}));
import {
    HeartPulse,
    Activity,
    ShieldCheck,
    ArrowRight,
    Orbit,
    ChevronRight,
} from 'lucide-react-native';

const SLIDES = [
    {
        eyebrow: 'NASA SPACE APPS CHALLENGE 2026',
        title: 'COSMIC CARE',
        subtitle: 'ASTRONAUT HEALTH • MISSION INTELLIGENCE',
        description:
            'A mission-control-inspired experience for exploring astronaut health beyond Earth.',
        Icon: Orbit,
    },
    {
        eyebrow: 'FLIGHT SYSTEM 01 / CREW HEALTH',
        title: 'EVERY HEARTBEAT MATTERS',
        subtitle: 'MONITOR. UNDERSTAND. RESPOND.',
        description:
            'Explore simulated astronaut vital signs, health trends, and early-warning scenarios.',
        Icon: HeartPulse,
    },
    {
        eyebrow: 'FLIGHT SYSTEM 02 / MISSION READY',
        title: 'YOUR MISSION STARTS HERE',
        subtitle: 'EXPLORE MISSION CONTROL',
        description:
            'Discover connected health monitoring, mission intelligence, and research insights.',
        Icon: ShieldCheck,
    },
];

const DURATION = 3200;

export default function WelcomeScreen({
                                          onEnter,
                                      }: {
    onEnter?: () => void;
}) {
    const [active, setActive] = useState(0);
    const { width } = useWindowDimensions();

    const opacity = useRef(new Animated.Value(0)).current;
    const translateX = useRef(new Animated.Value(40)).current;
    const scale = useRef(new Animated.Value(0.94)).current;
    const progress = useRef(new Animated.Value(0)).current;

    const activeRef = useRef(0);
    const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const animationRef = useRef<Animated.CompositeAnimation | null>(null);

    const animateSlide = (index: number) => {
        if (timer.current) clearTimeout(timer.current);
        animationRef.current?.stop();

        activeRef.current = index;
        setActive(index);

        opacity.setValue(0);
        translateX.setValue(45);
        scale.setValue(0.94);
        progress.setValue(0);

        const entrance = Animated.parallel([
            Animated.timing(opacity, {
                toValue: 1,
                duration: 850,
                useNativeDriver: true,
            }),
            Animated.spring(translateX, {
                toValue: 0,
                friction: 9,
                tension: 35,
                useNativeDriver: true,
            }),
            Animated.spring(scale, {
                toValue: 1,
                friction: 9,
                tension: 30,
                useNativeDriver: true,
            }),
        ]);

        const bar = Animated.timing(progress, {
            toValue: 1,
            duration: DURATION,
            useNativeDriver: false,
        });

        animationRef.current = entrance;
        entrance.start();

        if (index < SLIDES.length - 1) {
            bar.start(({ finished }) => {
                if (finished && activeRef.current === index) {
                    animateSlide(index + 1);
                }
            });
        }
    };

    useEffect(() => {
        animateSlide(0);

        return () => {
            if (timer.current) clearTimeout(timer.current);
            animationRef.current?.stop();
            progress.stopAnimation();
        };
    }, []);

    const next = () => {
        progress.stopAnimation();
        if (active < SLIDES.length - 1) {
            animateSlide(active + 1);
        } else {
            enterMission();
        }
    };

    const enterMission = () => {
        progress.stopAnimation();
        if (onEnter) {
            onEnter();
        } else {
            router.replace('/');
        }
    };

    const slide = SLIDES[active];
    const Icon = slide.Icon;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" />

            <View style={styles.glowOne} />
            <View style={styles.glowTwo} />
            <View pointerEvents="none" style={StyleSheet.absoluteFill}>
                {STARS.map((star, index) => (
                    <View key={index} style={{
                        position: 'absolute', left: star.left, top: star.top,
                        width: star.size, height: star.size, borderRadius: star.size,
                        backgroundColor: '#D8F5FF', opacity: star.opacity,
                    }} />
                ))}
            </View>

            <View style={styles.header}>
                <View style={styles.logoRow}>
                    <HeartPulse size={23} color="#67E8F9" />
                    <Text style={styles.logoText}>COSMIC CARE</Text>
                </View>

                <Pressable onPress={enterMission}>
                    <Text style={styles.skip}>SKIP</Text>
                </Pressable>
            </View>

            <Animated.View
                style={[
                    styles.slide,
                    {
                        opacity,
                        transform: [
                            { translateX },
                            { scale },
                        ],
                    },
                ]}
            >
                <View style={styles.missionTag}>
                    <View style={styles.redDot} />
                    <Text style={styles.missionTagText}>SPACE APPS 2026  /  INDEPENDENT PROJECT</Text>
                </View>
                <View style={styles.orbitOuter}>
                    <View style={styles.orbitMiddle}>
                        <View style={styles.orbitInner}>
                            <Icon size={Math.min(width * 0.15, 70)} color="#67E8F9" />
                        </View>
                    </View>
                </View>

                <Text style={styles.flightNumber}>CC — 0{active + 1} / 03</Text>
                <Text style={styles.eyebrow}>
                    {slide.eyebrow}
                </Text>

                <Text style={styles.title}>
                    {slide.title}
                </Text>

                <Text style={styles.subtitle}>
                    {slide.subtitle}
                </Text>

                <Text style={styles.description}>
                    {slide.description}
                </Text>

                <View style={styles.featureRow}>
                    <View style={styles.feature}>
                        <Activity size={16} color="#67E8F9" />
                        <Text style={styles.featureText}>HEALTH</Text>
                    </View>

                    <View style={styles.feature}>
                        <ShieldCheck size={16} color="#67E8F9" />
                        <Text style={styles.featureText}>SAFETY</Text>
                    </View>

                    <View style={styles.feature}>
                        <Orbit size={16} color="#67E8F9" />
                        <Text style={styles.featureText}>SPACE</Text>
                    </View>
                </View>
            </Animated.View>

            <View style={styles.footer}>
                <View style={styles.progressRow}>
                    {SLIDES.map((_, index) => (
                        <Pressable
                            key={index}
                            onPress={() => animateSlide(index)}
                            style={styles.progressTrack}
                        >
                            {index < active ? (
                                <View style={[styles.progressFill, { width: '100%' }]} />
                            ) : index === active ? (
                                <Animated.View
                                    style={[
                                        styles.progressFill,
                                        {
                                            width: progress.interpolate({
                                                inputRange: [0, 1],
                                                outputRange: ['0%', '100%'],
                                            }),
                                        },
                                    ]}
                                />
                            ) : null}
                        </Pressable>
                    ))}
                </View>

                <Pressable
                    onPress={next}
                    style={styles.button}
                >
                    <Text style={styles.buttonText}>
                        {active === SLIDES.length - 1
                            ? 'ENTER MISSION CONTROL'
                            : 'CONTINUE'}
                    </Text>

                    {active === SLIDES.length - 1 ? (
                        <ArrowRight size={21} color="#06111F" />
                    ) : (
                        <ChevronRight size={21} color="#06111F" />
                    )}
                </Pressable>

                <Text style={styles.disclaimer}>
                    SIMULATED DATA  •  EDUCATIONAL DEMO  •  NOT NASA-ENDORSED
                </Text>
            </View>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#050B19',
        overflow: 'hidden',
    },
    glowOne: {
        position: 'absolute',
        width: 320,
        height: 320,
        borderRadius: 160,
        backgroundColor: '#0A2946',
        top: -140,
        right: -120,
        opacity: 0.7,
    },
    glowTwo: {
        position: 'absolute',
        width: 280,
        height: 280,
        borderRadius: 140,
        backgroundColor: '#102E49',
        bottom: -160,
        left: -120,
        opacity: 0.6,
    },
    header: {
        paddingHorizontal: 25,
        paddingTop: 22,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    logoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 9,
    },
    logoText: {
        color: '#EAFBFF',
        fontSize: 15,
        fontWeight: '800',
        letterSpacing: 2,
    },
    skip: {
        color: '#8CA3BD',
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 2,
    },
    slide: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 28,
    },
    missionTag: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20,
        borderWidth: 1, borderColor: '#3B4A61', backgroundColor: '#101B2B',
        marginBottom: 22,
    },
    redDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#FC4755' },
    missionTagText: { color: '#CAD6E5', fontSize: 9, fontWeight: '800', letterSpacing: 1 },
    flightNumber: { color: '#FC6371', fontSize: 10, fontWeight: '800', letterSpacing: 3, marginBottom: 9 },
    orbitOuter: {
        width: 220,
        height: 220,
        borderRadius: 110,
        borderWidth: 1,
        borderColor: '#24506A',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 25,
    },
    orbitMiddle: {
        width: 175,
        height: 175,
        borderRadius: 88,
        borderWidth: 1,
        borderColor: '#327B98',
        alignItems: 'center',
        justifyContent: 'center',
    },
    orbitInner: {
        width: 125,
        height: 125,
        borderRadius: 63,
        backgroundColor: '#103149',
        alignItems: 'center',
        justifyContent: 'center',
    },
    eyebrow: {
        color: '#67E8F9',
        fontSize: 11,
        fontWeight: '800',
        letterSpacing: 3,
        textAlign: 'center',
        marginBottom: 16,
    },
    title: {
        color: '#FFFFFF',
        fontSize: 29,
        fontWeight: '900',
        letterSpacing: 2.2,
        textAlign: 'center',
        marginBottom: 13,
    },
    subtitle: {
        color: '#8BDDEC',
        fontSize: 12,
        fontWeight: '800',
        letterSpacing: 2,
        textAlign: 'center',
        marginBottom: 20,
    },
    description: {
        color: '#A4B5CC',
        fontSize: 15,
        lineHeight: 25,
        textAlign: 'center',
        maxWidth: 360,
    },
    featureRow: {
        flexDirection: 'row',
        gap: 10,
        marginTop: 24,
        flexWrap: 'wrap',
        justifyContent: 'center',
    },
    feature: {
        flexDirection: 'row',
        gap: 7,
        alignItems: 'center',
        backgroundColor: '#10263A',
        borderWidth: 1,
        borderColor: '#1D455B',
        borderRadius: 25,
        paddingHorizontal: 13,
        paddingVertical: 10,
    },
    featureText: {
        color: '#A8DCE8',
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 1,
    },
    footer: {
        paddingHorizontal: 25,
        paddingBottom: 30,
        gap: 16,
    },
    progressRow: {
        flexDirection: 'row',
        gap: 8,
    },
    progressTrack: {
        flex: 1,
        height: 4,
        backgroundColor: '#19334C',
        borderRadius: 5,
        overflow: 'hidden',
    },
    progressFill: {
        height: '100%',
        backgroundColor: '#67E8F9',
        borderRadius: 5,
    },
    button: {
        backgroundColor: '#67E8F9',
        borderRadius: 16,
        paddingVertical: 18,
        paddingHorizontal: 20,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    buttonText: {
        color: '#06111F',
        fontSize: 14,
        fontWeight: '900',
        letterSpacing: 1.3,
    },
    disclaimer: {
        color: '#647C98',
        fontSize: 10,
        textAlign: 'center',
        letterSpacing: 1,
    },
});

