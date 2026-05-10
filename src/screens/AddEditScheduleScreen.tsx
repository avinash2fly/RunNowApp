import React, { useEffect, useState } from 'react';
import {
  View, Text, TouchableOpacity, Switch, ScrollView,
  StyleSheet, Alert, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Slider from '@react-native-community/slider';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, Typography } from '../theme';
import { usePreferences } from '../store/PreferencesContext';
import { getScheduleById, insertSchedule, updateSchedule } from '../services/database';
import { scheduleWeeklyRunNotification } from '../services/notifications';
import { RunType, DayOfWeek } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type RouteType = RouteProp<RootStackParamList, 'AddEditSchedule'>;

const DAY_LABELS: { short: string; full: string; dow: DayOfWeek }[] = [
  { short: 'S', full: 'Sun', dow: 0 },
  { short: 'M', full: 'Mon', dow: 1 },
  { short: 'T', full: 'Tue', dow: 2 },
  { short: 'W', full: 'Wed', dow: 3 },
  { short: 'T', full: 'Thu', dow: 4 },
  { short: 'F', full: 'Fri', dow: 5 },
  { short: 'S', full: 'Sat', dow: 6 },
];

const RUN_TYPES: RunType[] = ['Easy', 'Tempo', 'Long', 'Recovery', 'Speed'];

export default function AddEditScheduleScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const { prefs } = usePreferences();
  const accent = prefs.accentColor ?? Colors.accent;

  const scheduleId = route.params?.scheduleId;
  const isEdit = !!scheduleId;

  const defaultTime = new Date(Date.now() + 30 * 60 * 1000);
  const [hour, setHour] = useState(defaultTime.getHours() % 12 || 12);
  const [minute, setMinute] = useState(Math.floor(defaultTime.getMinutes() / 5) * 5);
  const [isPM, setIsPM] = useState(defaultTime.getHours() >= 12);
  const [selectedDay, setSelectedDay] = useState<DayOfWeek>(defaultTime.getDay() as DayOfWeek);
  const [distanceKm, setDistanceKm] = useState(5);
  const [runType, setRunType] = useState<RunType>('Easy');
  const [notifyNoRain, setNotifyNoRain] = useState(true);
  const [notifyWind, setNotifyWind] = useState(true);
  const [notifyAhead, setNotifyAhead] = useState(true);

  useEffect(() => {
    if (scheduleId) {
      getScheduleById(scheduleId).then(s => {
        if (!s) return;
        const h = s.hour % 12 || 12;
        setHour(h);
        setMinute(s.minute);
        setIsPM(s.hour >= 12);
        setSelectedDay(s.dayOfWeek);
        setDistanceKm(s.distanceKm);
        setRunType(s.runType);
        setNotifyNoRain(s.notifyNoRain);
        setNotifyWind(s.notifyWind);
        setNotifyAhead(s.notifyAhead);
      });
    }
  }, [scheduleId]);

  const hour24 = () => {
    if (!isPM) return hour === 12 ? 0 : hour;
    return hour === 12 ? 12 : hour + 12;
  };

  const handleSave = async () => {
    const scheduleData = {
      dayOfWeek: selectedDay,
      hour: hour24(),
      minute,
      distanceKm,
      runType,
      isEnabled: true,
      notifyNoRain,
      notifyWind,
      notifyAhead,
      createdAt: Date.now(),
    };

    try {
      let savedId: number;
      if (isEdit && scheduleId) {
        await updateSchedule({ ...scheduleData, id: scheduleId });
        savedId = scheduleId;
      } else {
        const saved = await insertSchedule(scheduleData);
        savedId = saved.id;
      }
      const leadMinutes = prefs.notifyLeadMinutes ?? 30;
      await scheduleWeeklyRunNotification(savedId, selectedDay, hour24(), minute, leadMinutes);
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Could not save schedule. Please try again.');
    }
  };

  const incrementHour = () => setHour(h => (h % 12) + 1);
  const decrementHour = () => setHour(h => (h - 2 + 12) % 12 + 1);
  const incrementMinute = () => setMinute(m => (m + 5) % 60);
  const decrementMinute = () => setMinute(m => (m - 5 + 60) % 60);

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />
      {/* Top bar */}
      <View style={styles.topBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Text style={styles.backIcon}>‹</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{isEdit ? 'Edit schedule' : 'Schedule a run'}</Text>
        <View style={{ width: 44 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>

        {/* Time picker */}
        <View style={styles.timePicker}>
          <TimeSpinner
            value={String(hour).padStart(2, '0')}
            onIncrement={incrementHour}
            onDecrement={decrementHour}
            accent={accent}
            highlighted={false}
          />
          <Text style={styles.colon}>:</Text>
          <TimeSpinner
            value={String(minute).padStart(2, '0')}
            onIncrement={incrementMinute}
            onDecrement={decrementMinute}
            accent={accent}
            highlighted
          />
          <TouchableOpacity
            style={[styles.ampmPill, isPM && { backgroundColor: accent }]}
            onPress={() => setIsPM(p => !p)}
          >
            <Text style={[styles.ampmText, isPM && { color: Colors.onAccent }]}>
              {isPM ? 'PM' : 'AM'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Day of week */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>REPEAT ON</Text>
          <View style={styles.dayRow}>
            {DAY_LABELS.map(d => (
              <TouchableOpacity
                key={d.dow}
                style={[styles.dayChip, selectedDay === d.dow && { backgroundColor: accent }]}
                onPress={() => setSelectedDay(d.dow)}
              >
                <Text style={[styles.dayChipText, selectedDay === d.dow && { color: Colors.onAccent }]}>
                  {d.short}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Distance */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>DISTANCE</Text>
          <View style={styles.distanceRow}>
            <Text style={styles.distanceNum}>{distanceKm}</Text>
            <Text style={styles.distanceUnit}>km</Text>
          </View>
          <Slider
            style={styles.slider}
            minimumValue={1}
            maximumValue={42}
            step={0.5}
            value={distanceKm}
            onValueChange={setDistanceKm}
            minimumTrackTintColor={accent}
            maximumTrackTintColor={Colors.surface3}
            thumbTintColor={accent}
          />
          <View style={styles.runTypeRow}>
            {RUN_TYPES.map(t => (
              <TouchableOpacity
                key={t}
                style={[styles.typePill, runType === t && { backgroundColor: accent }]}
                onPress={() => setRunType(t)}
              >
                <Text style={[styles.typePillText, runType === t && { color: Colors.onAccent }]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Notify when */}
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>NOTIFY WHEN</Text>
          <View style={styles.notifyCard}>
            <NotifyRow
              icon="🌧️"
              label="No rain"
              sub="Skip if precipitation"
              value={notifyNoRain}
              onToggle={setNotifyNoRain}
              accent={accent}
            />
            <View style={styles.divider} />
            <NotifyRow
              icon="💨"
              label={`Wind under ${prefs.windThresholdKmh ?? 15} km/h`}
              sub="Skip if too windy"
              value={notifyWind}
              onToggle={setNotifyWind}
              accent={accent}
            />
            <View style={styles.divider} />
            <NotifyRow
              icon="⏰"
              label={`Notify ${prefs.notifyLeadMinutes ?? 30} min ahead`}
              sub="Early local notification"
              value={notifyAhead}
              onToggle={setNotifyAhead}
              accent={accent}
            />
          </View>
        </View>

        <View style={{ height: 90 }} />
      </ScrollView>

      {/* Save button */}
      <View style={styles.saveBar}>
        <TouchableOpacity style={[styles.saveBtn, { backgroundColor: accent }]} onPress={handleSave} activeOpacity={0.85}>
          <Text style={styles.saveBtnText}>{isEdit ? 'Update schedule' : 'Save schedule'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function TimeSpinner({
  value, onIncrement, onDecrement, accent, highlighted,
}: {
  value: string; onIncrement: () => void; onDecrement: () => void; accent: string; highlighted: boolean;
}) {
  return (
    <View style={styles.spinner}>
      <TouchableOpacity onPress={onIncrement} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
        <Text style={styles.spinnerArrow}>▲</Text>
      </TouchableOpacity>
      <View style={[styles.spinnerVal, highlighted && { backgroundColor: Colors.accentSoft }]}>
        <Text style={[styles.spinnerText, highlighted && { color: Colors.onAccentSoft }]}>{value}</Text>
      </View>
      <TouchableOpacity onPress={onDecrement} hitSlop={{ top: 8, bottom: 8, left: 12, right: 12 }}>
        <Text style={styles.spinnerArrow}>▼</Text>
      </TouchableOpacity>
    </View>
  );
}

function NotifyRow({
  icon, label, sub, value, onToggle, accent,
}: {
  icon: string; label: string; sub: string; value: boolean; onToggle: (v: boolean) => void; accent: string;
}) {
  return (
    <View style={styles.notifyRow}>
      <Text style={{ fontSize: 20 }}>{icon}</Text>
      <View style={{ flex: 1 }}>
        <Text style={styles.notifyLabel}>{label}</Text>
        <Text style={styles.notifySub}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: Colors.surface3, true: accent + '66' }}
        thumbColor={value ? accent : Colors.onSurfaceVar}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  topBar: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, minHeight: 56,
  },
  backBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  backIcon: { fontSize: 32, color: Colors.onSurface, lineHeight: 36 },
  title: { ...Typography.h3, color: Colors.onSurface },
  scroll: { padding: Spacing.lg, gap: Spacing.xl },
  timePicker: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.md },
  colon: { fontSize: 48, fontWeight: '700', color: Colors.onSurface, marginBottom: 8 },
  spinner: { alignItems: 'center', gap: Spacing.xs },
  spinnerArrow: { fontSize: 16, color: Colors.onSurfaceVar },
  spinnerVal: { borderRadius: Radius.sm, paddingHorizontal: Spacing.sm, paddingVertical: Spacing.xs },
  spinnerText: { fontSize: 64, fontWeight: '700', letterSpacing: -2, color: Colors.onSurface },
  ampmPill: {
    borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs,
    backgroundColor: Colors.surface2, marginTop: Spacing.sm,
  },
  ampmText: { ...Typography.bodyBold, color: Colors.onSurfaceVar },
  section: { gap: Spacing.sm },
  sectionLabel: { ...Typography.label, color: Colors.onSurfaceVar },
  dayRow: { flexDirection: 'row', gap: Spacing.sm },
  dayChip: {
    flex: 1, height: 40, borderRadius: Radius.sm,
    backgroundColor: Colors.surface2, alignItems: 'center', justifyContent: 'center',
  },
  dayChipText: { ...Typography.bodyBold, color: Colors.onSurfaceVar },
  distanceRow: { flexDirection: 'row', alignItems: 'baseline', gap: Spacing.xs },
  distanceNum: { fontSize: 42, fontWeight: '700', color: Colors.onSurface, letterSpacing: -1 },
  distanceUnit: { ...Typography.h3, color: Colors.onSurfaceVar },
  slider: { height: 40, marginHorizontal: -Spacing.xs },
  runTypeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  typePill: {
    borderRadius: Radius.pill, paddingHorizontal: Spacing.md, paddingVertical: 6,
    backgroundColor: Colors.surface2,
  },
  typePillText: { ...Typography.small, color: Colors.onSurfaceVar },
  notifyCard: { backgroundColor: Colors.surface1, borderRadius: Radius.lg, overflow: 'hidden' },
  notifyRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.lg },
  notifyLabel: { ...Typography.bodyBold, color: Colors.onSurface },
  notifySub: { ...Typography.small, color: Colors.onSurfaceVar, marginTop: 1 },
  divider: { height: 1, backgroundColor: Colors.outline, marginLeft: Spacing.lg + 20 + Spacing.md },
  saveBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    padding: Spacing.lg, paddingBottom: Platform.OS === 'ios' ? 32 : Spacing.lg,
    backgroundColor: Colors.surface,
  },
  saveBtn: { height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { ...Typography.bodyBold, color: Colors.onAccent, fontSize: 16 },
});
