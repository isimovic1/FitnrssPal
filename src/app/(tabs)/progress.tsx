import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Pressable, Text } from 'react-native';

import { LineChart } from '../../components/charts';
import { Button, Card, fmt, ProgressBar, Row, Screen, Segmented, Stat, styles } from '../../components/ui';
import { bmi, bmiCategory, calorieGoal, daysToGoal, KCAL_PER_KG, round1, weightTrendPerDay } from '../../lib/calc';
import { addDays, daysBetween, friendlyDate, fromDateKey, shortDate, startOfWeek, todayKey } from '../../lib/dates';
import { comparePair } from '../../lib/photos';
import { useProfile, useStore } from '../../lib/store';
import { colors, spacing } from '../../theme';

type Range = '30' | '90' | 'all';

const signed = (n: number) => {
  const r = round1(n);
  return r === 0 ? '0,0' : `${r > 0 ? '+' : '−'}${fmt(Math.abs(r), 1)}`;
};

export default function Progress() {
  const { state, removeWeight } = useStore();
  const profile = useProfile();
  const [range, setRange] = useState<Range>('90');
  const today = todayKey();
  const weights = state.weights;
  const photoPair = comparePair(state.photos, 'front');

  const current = weights.length ? weights[weights.length - 1].kg : profile.startWeightKg;
  const start = profile.startWeightKg;
  const goal = profile.goalWeightKg;
  const lost = start - current;
  const total = start - goal;
  const pct = total !== 0 ? Math.max(0, Math.min(1, lost / total)) : 1;
  const bmiValue = bmi(current, profile.heightCm);

  const from = range === 'all' ? '0000-00-00' : addDays(today, -Number(range));
  const visible = weights.filter((w) => w.date >= from);
  const origin = visible[0]?.date ?? today;
  const points = visible.map((w) => ({ x: daysBetween(origin, w.date), y: w.kg }));

  // Trend over the last 4 weeks of weigh-ins.
  const recent = weights.filter((w) => w.date >= addDays(today, -28));
  const trend = weightTrendPerDay(recent);
  const trendDays = trend !== null ? daysToGoal(current, goal, trend) : null;
  const plan = calorieGoal(profile, current);
  const planPerDay = -plan.plannedDeficit / KCAL_PER_KG;
  const planDays = daysToGoal(current, goal, planPerDay);
  const dateIn = (days: number) => {
    const d = addDays(today, days);
    return `${shortDate(d)}${fromDateKey(d).getFullYear()}.`;
  };

  const waists = weights.filter((w) => w.waistCm);
  const bodyFats = weights.filter((w) => w.bodyFatPct);

  return (
    <Screen>
      <Card title="Cilj">
        <Row>
          <Stat label="Početak" value={fmt(start, 1)} unit="kg" />
          <Stat label="Sada" value={fmt(current, 1)} unit="kg" color={colors.primary} />
          <Stat label="Cilj" value={fmt(goal, 1)} unit="kg" color={colors.success} />
        </Row>
        <ProgressBar value={pct * 100} max={100} color={colors.success} />
        <Text style={styles.muted}>
          {Math.abs(current - goal) < 0.05
            ? 'Cilj postignut! 🎉'
            : `Promjena od početka: ${signed(-lost)} kg · do cilja još ${fmt(Math.abs(round1(current - goal)), 1)} kg (${fmt(pct * 100)} %)`}
        </Text>
      </Card>

      <Card
        title="Slike napretka"
        right={<Button title="Otvori" variant="secondary" style={{ paddingVertical: 6 }} onPress={() => router.push('/photos')} />}
        style={!state.photos[startOfWeek(today)] ? { borderWidth: 1.5, borderColor: colors.warning } : undefined}
      >
        {photoPair ? (
          <Row style={{ alignItems: 'flex-start' }}>
            {[{ t: 'Početak', p: photoPair.first }, { t: 'Sada', p: photoPair.latest }].map(({ t, p }) => (
              <Pressable key={t} onPress={() => router.push('/photos')} style={{ flex: 1, gap: 4 }}>
                <Image source={{ uri: p.front }} style={{ aspectRatio: 3 / 4, borderRadius: 10 }} resizeMode="cover" />
                <Text style={[styles.muted, { textAlign: 'center', fontSize: 12 }]}>{t} · {shortDate(p.week)}</Text>
              </Pressable>
            ))}
          </Row>
        ) : (
          <Text style={styles.muted}>Jednom tjedno (početkom tjedna) slikaj se sprijeda, straga i bočno pa uspoređuj početak i sada.</Text>
        )}
        {!state.photos[startOfWeek(today)] && (
          <Text style={{ color: colors.warning, fontSize: 12 }}>Ovaj tjedan još nema slika.</Text>
        )}
      </Card>

      <Card title="Težina" right={<Button title="+ Unesi" variant="secondary" style={{ paddingVertical: 6 }} onPress={() => router.push('/log-weight')} />}>
        <Segmented
          options={[{ value: '30', label: '30 dana' }, { value: '90', label: '90 dana' }, { value: 'all', label: 'Sve' }]}
          value={range}
          onChange={setRange}
        />
        <LineChart points={points} goal={goal} xLabel={(x) => shortDate(addDays(origin, x))} />
      </Card>

      <Card title="Prognoza">
        <Text style={styles.text}>
          Trend (zadnjih 28 dana):{' '}
          {trend === null
            ? 'premalo vaganja'
            : `${trend * 7 > 0 ? '+' : ''}${fmt(trend * 7, 2)} kg/tjedan`}
        </Text>
        {trend !== null && (
          <Text style={styles.muted}>
            {trendDays === null
              ? 'Ovim tempom se ne približavaš cilju.'
              : trendDays === 0
                ? 'Na cilju si.'
                : `Ovim tempom cilj oko ${dateIn(trendDays)} (${trendDays} dana).`}
          </Text>
        )}
        <Text style={[styles.text, { marginTop: spacing.xs }]}>
          Po planu ({plan.goal} kcal/dan): {planDays === null ? 'plan ne vodi prema cilju' : planDays === 0 ? 'na cilju' : `cilj oko ${dateIn(planDays)}`}
        </Text>
      </Card>

      <Card title="Indeks tjelesne mase (BMI)">
        <Row>
          <Stat label={bmiCategory(bmiValue)} value={fmt(bmiValue, 1)} />
          <Stat label="BMI na cilju" value={fmt(bmi(goal, profile.heightCm), 1)} />
        </Row>
      </Card>

      {(waists.length > 0 || bodyFats.length > 0) && (
        <Card title="Mjere">
          {waists.length > 0 && (
            <Text style={styles.text}>
              Struk: {fmt(waists[waists.length - 1].waistCm!, 1)} cm
              {waists.length > 1 ? ` (${fmt(round1(waists[waists.length - 1].waistCm! - waists[0].waistCm!), 1)} cm od početka)` : ''}
            </Text>
          )}
          {bodyFats.length > 0 && (
            <Text style={styles.text}>
              Masno tkivo: {fmt(bodyFats[bodyFats.length - 1].bodyFatPct!, 1)} %
              {bodyFats.length > 1 ? ` (${fmt(round1(bodyFats[bodyFats.length - 1].bodyFatPct! - bodyFats[0].bodyFatPct!), 1)} % od početka)` : ''}
            </Text>
          )}
        </Card>
      )}

      <Card title="Povijest vaganja">
        {weights.length === 0 && <Text style={styles.muted}>Još nema unosa.</Text>}
        {[...weights].reverse().slice(0, 30).map((w, i, arr) => {
          const prev = arr[i + 1];
          const diff = prev ? w.kg - prev.kg : 0;
          return (
            <Pressable
              key={w.date}
              onPress={() => router.push({ pathname: '/log-weight', params: { date: w.date } })}
              onLongPress={() =>
                Alert.alert('Obriši vaganje?', friendlyDate(w.date), [
                  { text: 'Odustani', style: 'cancel' },
                  { text: 'Obriši', style: 'destructive', onPress: () => removeWeight(w.date) },
                ])
              }
            >
              <Row style={{ justifyContent: 'space-between', paddingVertical: 4 }}>
                <Text style={styles.text}>{friendlyDate(w.date)}</Text>
                <Text style={styles.text}>
                  {fmt(w.kg, 1)} kg{' '}
                  {prev ? (
                    <Text style={{ color: diff <= 0 ? colors.success : colors.danger }}>
                      ({diff > 0 ? '+' : ''}{fmt(diff, 1)})
                    </Text>
                  ) : null}
                </Text>
              </Row>
            </Pressable>
          );
        })}
        {weights.length > 0 && <Text style={[styles.muted, { fontSize: 12 }]}>Dodir za uređivanje, dugi pritisak za brisanje.</Text>}
      </Card>
    </Screen>
  );
}
