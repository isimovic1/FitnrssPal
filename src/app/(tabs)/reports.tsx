import Ionicons from '@expo/vector-icons/Ionicons';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';

import { BarChart } from '../../components/charts';
import { Card, fmt, ProgressBar, Row, Screen, Segmented, Stat, styles } from '../../components/ui';
import { round1 } from '../../lib/calc';
import {
  addDays, addMonths, endOfMonth, fromDateKey, monthName, shortDate, startOfMonth, startOfWeek, todayKey, weekdayShort,
} from '../../lib/dates';
import { periodReport } from '../../lib/reports';
import { useProfile, useStore } from '../../lib/store';
import { colors, spacing } from '../../theme';

type Period = 'week' | 'month';

export default function Reports() {
  const { state } = useStore();
  const profile = useProfile();
  const today = todayKey();
  const [period, setPeriod] = useState<Period>('week');
  const [anchor, setAnchor] = useState(today);

  const start = period === 'week' ? startOfWeek(anchor) : startOfMonth(anchor);
  const end = period === 'week' ? addDays(start, 6) : endOfMonth(anchor);
  const isCurrent = end >= today;
  const r = periodReport(state, start, end, today);

  const shift = (dir: 1 | -1) => setAnchor(period === 'week' ? addDays(start, 7 * dir) : addMonths(anchor, dir));
  const title =
    period === 'week'
      ? `${shortDate(start)} – ${shortDate(end)}${fromDateKey(end).getFullYear()}.`
      : `${monthName(start)} ${fromDateKey(start).getFullYear()}.`;

  const bars = r.days.map((d) => ({
    label: period === 'week' ? weekdayShort(d.date) : String(fromDateKey(d.date).getDate()),
    value: Math.round(d.intake.kcal),
    target: d.goal + d.exerciseKcal,
  }));
  const macroKcal = r.avgIntake.protein * 4 + r.avgIntake.carbs * 4 + r.avgIntake.fat * 9 || 1;

  return (
    <Screen>
      <Segmented
        options={[{ value: 'week', label: 'Tjedni' }, { value: 'month', label: 'Mjesečni' }]}
        value={period}
        onChange={(p) => {
          setPeriod(p);
          setAnchor(today);
        }}
      />
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => shift(-1)} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{title}</Text>
        <Pressable onPress={() => shift(1)} hitSlop={12} disabled={isCurrent}>
          <Ionicons name="chevron-forward" size={24} color={isCurrent ? colors.border : colors.primary} />
        </Pressable>
      </Row>

      {r.loggedDays === 0 ? (
        <Card>
          <Text style={styles.muted}>Za ovo razdoblje nema unosa hrane.</Text>
        </Card>
      ) : (
        <>
          <Card title="Kalorijski deficit">
            <Row>
              <Stat
                label={r.totalDeficit >= 0 ? 'Ukupni deficit' : 'Ukupni suficit'}
                value={fmt(Math.abs(r.totalDeficit))}
                unit="kcal"
                color={r.totalDeficit >= 0 ? colors.success : colors.danger}
              />
              <Stat label="Prosjek dnevno" value={fmt(r.avgDeficit)} unit="kcal" />
            </Row>
            <Row>
              <Stat
                label="Procjena promjene (iz deficita)"
                value={`${r.estimatedKgChange > 0 ? '+' : ''}${fmt(round1(r.estimatedKgChange), 1)}`}
                unit="kg"
              />
              <Stat
                label="Stvarna promjena (vaga)"
                value={r.actualKgChange === null ? '–' : `${r.actualKgChange > 0 ? '+' : ''}${fmt(round1(r.actualKgChange), 1)}`}
                unit={r.actualKgChange === null ? undefined : 'kg'}
              />
            </Row>
            <Text style={[styles.muted, { fontSize: 12 }]}>
              Deficit = potrošnja (TDEE + vježba) − unos, za {r.deficitDays} završenih dana s unosom (današnji dan
              se ne broji dok traje). 7700 kcal ≈ 1 kg masti.
            </Text>
          </Card>

          <Card title="Unos kalorija po danu">
            <BarChart data={bars} goal={Math.round(r.avgGoal)} />
            <Row style={{ justifyContent: 'center', gap: spacing.lg }}>
              <LegendDot color={colors.primary} label="unutar cilja" />
              <LegendDot color={colors.danger} label="preko cilja" />
              <LegendDot color={colors.success} label="cilj" />
            </Row>
          </Card>

          <Card title="Prosjeci">
            <Row>
              <Stat label="kcal / dan" value={fmt(r.avgIntake.kcal)} />
              <Stat label="cilj" value={fmt(r.avgGoal)} />
              <Stat label="dana u cilju" value={`${r.daysOnTarget}/${r.loggedDays}`} />
            </Row>
            <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
              <MacroShare label="Proteini" grams={r.avgIntake.protein} pct={(r.avgIntake.protein * 4) / macroKcal} color={colors.protein} target={profile.macroSplit.protein} />
              <MacroShare label="Ugljikohidrati" grams={r.avgIntake.carbs} pct={(r.avgIntake.carbs * 4) / macroKcal} color={colors.carbs} target={profile.macroSplit.carbs} />
              <MacroShare label="Masti" grams={r.avgIntake.fat} pct={(r.avgIntake.fat * 9) / macroKcal} color={colors.fat} target={profile.macroSplit.fat} />
            </View>
            <Row style={{ marginTop: spacing.sm }}>
              <Stat label="Vlakna" value={fmt(r.avgIntake.fiber ?? 0)} unit="g" />
              <Stat label="Šećeri" value={fmt(r.avgIntake.sugar ?? 0)} unit="g" />
              <Stat label="Sol" value={fmt(r.avgIntake.salt ?? 0, 1)} unit="g" />
            </Row>
          </Card>

          <Card title="Aktivnost i navike">
            <Row>
              <Stat label="Vježba ukupno" value={fmt(r.totalExerciseKcal)} unit="kcal" color={colors.exercise} />
              <Stat label="Voda prosj." value={fmt(r.avgWaterMl / 1000, 1)} unit="l" color={colors.water} />
              <Stat label="Koraci prosj." value={fmt(r.avgSteps)} />
            </Row>
            <Text style={[styles.muted, { fontSize: 12 }]}>
              Dana s unosom hrane: {r.loggedDays} od {r.days.length}
            </Text>
          </Card>
        </>
      )}
    </Screen>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <Row style={{ gap: 4 }}>
      <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: color }} />
      <Text style={[styles.muted, { fontSize: 12 }]}>{label}</Text>
    </Row>
  );
}

function MacroShare({ label, grams, pct, color, target }: {
  label: string;
  grams: number;
  pct: number;
  color: string;
  target: number;
}) {
  return (
    <View style={{ gap: 4 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={styles.text}>{label}</Text>
        <Text style={styles.muted}>
          {fmt(grams)} g · {fmt(pct * 100)} % (cilj {target} %)
        </Text>
      </Row>
      <ProgressBar value={pct * 100} max={100} color={color} />
    </View>
  );
}
