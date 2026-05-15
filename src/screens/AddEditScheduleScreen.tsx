import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, Switch, ScrollView,
  StyleSheet, Alert, Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import Slider from '@react-native-community/slider';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Line, Circle as SvgCircle } from 'react-native-svg';
import { usePreferences, useTokens } from '../store/PreferencesContext';
import { getScheduleById, insertSchedule, updateSchedule } from '../services/database';
import { scheduleWeeklyRunNotification } from '../services/notifications';
import { Icon, IconName } from '../components/Icon';
import { Card } from '../components/Card';
import { TopBar } from '../components/TopBar';
import { SectionTitle } from '../components/SectionTitle';
import { RunType, DayOfWeek } from '../types';
import type { RootStackParamList } from '../navigation/AppNavigator';

type RouteType = RouteProp<RootStackParamList, 'AddEditSchedule'>;

const DAY_CHIPS: { short: string; dow: DayOfWeek }[] = [
  { short: 'M', dow: 1 },
  { short: 'T', dow: 2 },
  { short: 'W', dow: 3 },
  { short: 'T', dow: 4 },
  { short: 'F', dow: 5 },
  { short: 'S', dow: 6 },
  { short: 'S', dow: 0 },
];

const RUN_TYPES: RunType[] = ['Easy', 'Tempo', 'Long', 'Recovery', 'Speed'];

// pace minutes per km for each run type (rough)
const PACE: Record<RunType, number> = {
  Easy: 6.0, Tempo: 4.8, Long: 6.2, Recovery: 6.8, Speed: 4.2,
};

const PRESETS = [
  { label: 'Dawn 6:00', hour: 6, minute: 0 },
  { label: 'Lunch 12:30', hour: 12, minute: 30 },
  { label: 'Evening 5:30', hour: 17, minute: 30 },
];

export default function AddEditScheduleScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteType>();
  const tk = useTokens();
  const { prefs } = usePreferences();

  const scheduleId = route.params?.scheduleId;
  const isEdit = !!scheduleId;

  const defaultTime = new Date(Date.now() + 30 * 60 * 1000);
  const [hour24, setHour24] = useState(defaultTime.getHours());
  const [minute, setMinute] = useState(Math.floor(defaultTime.getMinutes() / 5) * 5);
  const [selectedDays, setSelectedDays] = useState<DayOfWeek[]>([defaultTime.getDay() as DayOfWeek]);
  const [distanceKm, setDistanceKm] = useState(5);
  const [runType, setRunType] = useState<RunType>('Easy');
  const [notifyNoRain, setNotifyNoRain] = useState(true);
  const [notifyWind, setNotifyWind] = useState(true);
  const [notifyAhead, setNotifyAhead] = useState(true);
  const [smartReschedule, setSmartReschedule] = useState(true);

  useEffect(() => {
    if (scheduleId) {
      getScheduleById(scheduleId).then(s => {
        if (!s) return;
        setHour24(s.hour);
        setMinute(s.minute);
        setSelectedDays([s.dayOfWeek]);
        setDistanceKm(s.distanceKm);
        setRunType(s.runType);
        setNotifyNoRain(s.notifyNoRain);
        setNotifyWind(s.notifyWind);
        setNotifyAhead(s.notifyAhead);
      });
    }
  }, [scheduleId]);

  const isPM = hour24 >= 12;
  const hour12 = hour24 % 12 || 12;
  const durationMin = useMemo(() => Math.round(distanceKm * PACE[runType]), [distanceKm, runType]);

  const handleSave = async () => {
    if (!selectedDays.length) {
      Alert.alert('Pick at least one day', 'Select which days this run repeats on.');
      return;
    }
    try {
      const leadMinutes = prefs.notifyLeadMinutes ?? 30;
      for (const dow of selectedDays) {
        const scheduleData = {
          dayOfWeek: dow,
          hour: hour24,
          minute,
          distanceKm,
          runType,
          isEnabled: true,
          notifyNoRain,
          notifyWind,
          notifyAhead,
          createdAt: Date.now(),
        };
        let savedId: number;
        if (isEdit && scheduleId && dow === selectedDays[0]) {
          await updateSchedule({ ...scheduleData, id: scheduleId });
          savedId = scheduleId;
        } else {
          const saved = await insertSchedule(scheduleData);
          savedId = saved.id;
        }
        await scheduleWeeklyRunNotification(savedId, dow, hour24, minute, leadMinutes);
      }
      navigation.goBack();
    } catch (err) {
      Alert.alert('Error', 'Could not save schedule. Please try again.');
    }
  };

  const incrementHour = () => setHour24(h => (h + 1) % 24);
  const decrementHour = () => setHour24(h => (h + 23) % 24);
  const incrementMinute = () => setMinute(m => (m + 5) % 60);
  const decrementMinute = () => setMinute(m => (m + 55) % 60);

  const toggleDay = (dow: DayOfWeek) => {
    setSelectedDays(prev => prev.includes(dow) ? prev.filter(d => d !== dow) : [...prev, dow]);
  };

  // Sun arc: rough positions for sunrise 6:30 AM, sunset 7:30 PM
  const sunrise = 6.5, sunset = 19.5;
  const scheduledFractional = hour24 + minute / 60;
  const pct = (h: number) => (h / 24) * 100;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: tk.surface }]} edges={['top', 'left', 'right']}>
      <StatusBar style={tk.isDark ? 'light' : 'dark'}/>
      <View style={{ paddingHorizontal: 16 }}>
        <TopBar
          title={isEdit ? 'Edit run' : 'Schedule a run'}
          leading="chevronL"
          onLead={() => navigation.goBack()}
          trailing="check"
          onTrail={handleSave}
        />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Time picker with sun arc */}
        <SectionTitle title="When"/>
        <Card tone="accent" padded={false} style={{ padding: 22, overflow: 'hidden' }}>
          <View style={styles.timeRow}>
            <TimeSpinner
              value={String(hour12).padStart(2, '0')}
              onIncrement={incrementHour}
              onDecrement={decrementHour}
              highlighted={false}
            />
            <Text style={[styles.colon, { color: tk.onSurface }]}>:</Text>
            <TimeSpinner
              value={String(minute).padStart(2, '0')}
              onIncrement={incrementMinute}
              onDecrement={decrementMinute}
              highlighted
            />
            <TouchableOpacity
              style={[styles.ampm, { backgroundColor: isPM ? tk.accent : tk.surface2 }]}
              onPress={() => setHour24(h => (h + 12) % 24)}
            >
              <Text style={[styles.ampmText, { color: isPM ? tk.onAccent : tk.onSurfaceVar }]}>
                {isPM ? 'PM' : 'AM'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Sun arc */}
          <View style={{ height: 44, marginTop: 18, position: 'relative' }}>
            <Svg height={36} width="100%" style={{ position: 'absolute', top: 4, left: 0 }}>
              <Line x1="0%" y1={14} x2="100%" y2={14} stroke={tk.outline} strokeWidth={2}/>
              <Line x1={`${pct(sunrise)}%`} y1={14} x2={`${pct(sunset)}%`} y2={14} stroke={tk.accent} strokeWidth={2}/>
              <SvgCircle cx={`${pct(scheduledFractional)}%`} cy={14} r={7} fill={tk.accent} stroke={tk.surface} strokeWidth={3}/>
            </Svg>
            <View style={[styles.sunMark, { left: `${pct(sunrise)}%` }]}>
              <Icon name="sun" size={14} color={tk.wait}/>
              <Text style={[styles.sunLabel, { color: tk.onSurfaceVar }]}>6:30</Text>
            </View>
            <View style={[styles.sunMark, { left: `${pct(sunset)}%` }]}>
              <Icon name="moon" size={14} color={tk.onSurfaceVar}/>
              <Text style={[styles.sunLabel, { color: tk.onSurfaceVar }]}>7:30</Text>
            </View>
          </View>

          {/* Quick presets */}
          <View style={[styles.pillRow, { marginTop: 6 }]}>
            {PRESETS.map(p => {
              const active = hour24 === p.hour && minute === p.minute;
              return (
                <TouchableOpacity
                  key={p.label}
                  onPress={() => { setHour24(p.hour); setMinute(p.minute); }}
                  style={[styles.pill, {
                    backgroundColor: active ? tk.accent : 'transparent',
                    borderColor: tk.outlineStrong,
                    borderWidth: active ? 0 : 1,
                  }]}
                >
                  <Text style={[styles.pillText, { color: active ? tk.onAccent : tk.onSurface }]}>{p.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Repeat */}
        <SectionTitle title="Repeat"/>
        <View style={styles.dayRow}>
          {DAY_CHIPS.map(d => {
            const active = selectedDays.includes(d.dow);
            return (
              <TouchableOpacity
                key={`${d.dow}-${d.short}`}
                style={[styles.dayChip, {
                  backgroundColor: active ? tk.accent : tk.surface2,
                  borderColor: tk.outline,
                  borderWidth: active ? 0 : 1,
                }]}
                onPress={() => toggleDay(d.dow)}
              >
                <Text style={[styles.dayChipText, { color: active ? tk.onAccent : tk.onSurface, fontWeight: active ? '700' : '600' }]}>
                  {d.short}
                </Text>
                {active && <View style={[styles.dayDot, { backgroundColor: tk.onAccent }]}/>}
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Distance & type */}
        <SectionTitle title="Distance & type"/>
        <Card tone="surface2">
          <View style={{ flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 8 }}>
              <Text style={[styles.distNum, { color: tk.onSurface }]}>{distanceKm.toFixed(1)}</Text>
              <Text style={[styles.distUnit, { color: tk.onSurfaceVar }]}>km</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[styles.label, { color: tk.onSurfaceVar }]}>~ DURATION</Text>
              <Text style={[styles.durNum, { color: tk.onSurface }]}>{durationMin} min</Text>
            </View>
          </View>
          <Slider
            style={{ height: 40, marginTop: 6 }}
            minimumValue={1}
            maximumValue={42}
            step={0.5}
            value={distanceKm}
            onValueChange={setDistanceKm}
            minimumTrackTintColor={tk.accent}
            maximumTrackTintColor={tk.surface3}
            thumbTintColor={tk.accent}
          />
          <View style={styles.tickRow}>
            {['1', '5', '10', '15', '20+ km'].map(t => (
              <Text key={t} style={{ color: tk.onSurfaceVar, fontSize: 10 }}>{t}</Text>
            ))}
          </View>
          <View style={[styles.pillRow, { marginTop: 14 }]}>
            {RUN_TYPES.map(t => {
              const active = runType === t;
              return (
                <TouchableOpacity
                  key={t}
                  onPress={() => setRunType(t)}
                  style={[styles.pill, {
                    backgroundColor: active ? tk.accent : 'transparent',
                    borderColor: tk.outlineStrong,
                    borderWidth: active ? 0 : 1,
                  }]}
                >
                  <Text style={[styles.pillText, { color: active ? tk.onAccent : tk.onSurface }]}>{t}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* Notify when */}
        <SectionTitle title="Notify me when"/>
        <Card tone="surface1" padded={false}>
          <ToggleRow icon="drop" label="No rain in the window" sub="Through end of run"
            value={notifyNoRain} onToggle={setNotifyNoRain}/>
          <Divider/>
          <ToggleRow icon="wind" label={`Wind under ${prefs.windThresholdKmh ?? 15} km/h`} sub="From your threshold"
            value={notifyWind} onToggle={setNotifyWind}/>
          <Divider/>
          <ToggleRow icon="bell" label={`Notify ${prefs.notifyLeadMinutes ?? 30} min ahead`} sub="With 4-hr forecast"
            value={notifyAhead} onToggle={setNotifyAhead}/>
        </Card>

        {/* Smart reschedule */}
        <Card tone="surface2" style={styles.smartCard}>
          <View style={[styles.smartIcon, { backgroundColor: tk.accent }]}>
            <Icon name="bolt" size={18} color={tk.onAccent}/>
          </View>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <Text style={[styles.smartTitle, { color: tk.onSurface }]}>Smart reschedule</Text>
              <View style={[styles.smartBadge, { backgroundColor: tk.accentSoft }]}>
                <Text style={{ color: tk.accent, fontSize: 9, fontWeight: '700', letterSpacing: 0.4 }}>NEW</Text>
              </View>
            </View>
            <Text style={[styles.smartBody, { color: tk.onSurfaceVar }]}>
              If conditions go bad, suggest the next best window within ±3 hours.
            </Text>
          </View>
          <Switch
            value={smartReschedule}
            onValueChange={setSmartReschedule}
            trackColor={{ false: tk.surface3, true: tk.accent }}
            thumbColor="#fff"
          />
        </Card>
      </ScrollView>

      {/* Sticky save bar */}
      <View style={[styles.saveBar, { backgroundColor: tk.surface }]}>
        <TouchableOpacity style={[styles.saveSecondary, { borderColor: tk.outlineStrong }]}>
          <Icon name="bell" size={22} color={tk.onSurface}/>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.85}
          style={[styles.savePrimary, { backgroundColor: tk.accent }]}
          onPress={handleSave}
        >
          <Icon name="check" size={20} color={tk.onAccent}/>
          <Text style={[styles.saveText, { color: tk.onAccent }]}>{isEdit ? 'Update schedule' : 'Save schedule'}</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

function TimeSpinner({ value, onIncrement, onDecrement, highlighted }: {
  value: string; onIncrement: () => void; onDecrement: () => void; highlighted: boolean;
}) {
  const tk = useTokens();
  return (
    <View style={{ alignItems: 'center' }}>
      <TouchableOpacity onPress={onIncrement} hitSlop={{ top: 12, bottom: 8, left: 12, right: 12 }}>
        <Text style={{ fontSize: 16, color: tk.onSurfaceVar }}>▲</Text>
      </TouchableOpacity>
      <View style={[styles.spinVal, highlighted && { backgroundColor: tk.surface, borderRadius: 12 }]}>
        <Text style={[styles.spinText, { color: highlighted ? tk.accent : tk.onSurface }]}>{value}</Text>
      </View>
      <TouchableOpacity onPress={onDecrement} hitSlop={{ top: 8, bottom: 12, left: 12, right: 12 }}>
        <Text style={{ fontSize: 16, color: tk.onSurfaceVar }}>▼</Text>
      </TouchableOpacity>
    </View>
  );
}

function ToggleRow({ icon, label, sub, value, onToggle }: {
  icon: IconName; label: string; sub: string; value: boolean; onToggle: (v: boolean) => void;
}) {
  const tk = useTokens();
  return (
    <View style={styles.toggleRow}>
      <View style={[styles.toggleIcon, { backgroundColor: tk.surface2 }]}>
        <Icon name={icon} size={18} color={tk.onSurface}/>
      </View>
      <View style={{ flex: 1 }}>
        <Text style={[styles.toggleLabel, { color: tk.onSurface }]}>{label}</Text>
        <Text style={[styles.toggleSub, { color: tk.onSurfaceVar }]}>{sub}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onToggle}
        trackColor={{ false: tk.surface3, true: tk.accent }}
        thumbColor="#fff"
      />
    </View>
  );
}

function Divider() {
  const tk = useTokens();
  return <View style={{ height: 1, backgroundColor: tk.outline, marginLeft: 18 + 36 + 14 }}/>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  scroll: { paddingHorizontal: 16, paddingBottom: 120, gap: 4 },
  timeRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 },
  colon: { fontSize: 56, fontWeight: '300', opacity: 0.5 },
  ampm: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 999, marginLeft: 6 },
  ampmText: { fontSize: 14, fontWeight: '700' },
  spinVal: { paddingHorizontal: 8 },
  spinText: { fontSize: 58, fontWeight: '700', letterSpacing: -2 },
  sunMark: {
    position: 'absolute', top: 0, alignItems: 'center',
    transform: [{ translateX: -10 }],
  },
  sunLabel: { fontSize: 9, fontWeight: '600', marginTop: 2 },
  pillRow: { flexDirection: 'row', gap: 6, flexWrap: 'wrap' },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999 },
  pillText: { fontSize: 13, fontWeight: '600' },
  dayRow: { flexDirection: 'row', gap: 6 },
  dayChip: {
    flex: 1, height: 48, borderRadius: 14,
    alignItems: 'center', justifyContent: 'center', position: 'relative',
  },
  dayChipText: { fontSize: 14 },
  dayDot: {
    position: 'absolute', bottom: 8,
    width: 4, height: 4, borderRadius: 2, opacity: 0.7,
  },
  distNum: { fontSize: 44, fontWeight: '700', letterSpacing: -1.5 },
  distUnit: { fontSize: 18, fontWeight: '600' },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.4 },
  durNum: { fontSize: 18, fontWeight: '700', marginTop: 2 },
  tickRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -4 },
  toggleRow: {
    flexDirection: 'row', alignItems: 'center', gap: 14, padding: 14, paddingHorizontal: 18,
  },
  toggleIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  toggleLabel: { fontSize: 14, fontWeight: '600' },
  toggleSub: { fontSize: 12, marginTop: 1 },
  smartCard: {
    flexDirection: 'row', gap: 12, padding: 14, marginTop: 12, alignItems: 'center',
  },
  smartIcon: { width: 36, height: 36, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  smartTitle: { fontSize: 14, fontWeight: '600' },
  smartBadge: { paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  smartBody: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  saveBar: {
    position: 'absolute', left: 0, right: 0, bottom: 0,
    paddingHorizontal: 16, paddingTop: 12,
    paddingBottom: Platform.OS === 'ios' ? 32 : 16,
    flexDirection: 'row', gap: 10,
  },
  saveSecondary: {
    width: 56, height: 56, borderRadius: 28, borderWidth: 1,
    alignItems: 'center', justifyContent: 'center',
  },
  savePrimary: {
    flex: 1, height: 56, borderRadius: 28,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  saveText: { fontSize: 16, fontWeight: '700' },
});
