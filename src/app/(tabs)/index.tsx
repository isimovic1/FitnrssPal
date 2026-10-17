import Ionicons from '@expo/vector-icons/Ionicons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, Text, TextInput, View } from 'react-native';

import { Ring } from '../../components/charts';
import { Button, Card, fmt, parseNum, ProgressBar, Row, Screen, Stat, styles } from '../../components/ui';
import { calorieGoal, macroGoals, weightOn } from '../../lib/calc';
import { WEIGH_IN_TIP } from '../../lib/photos';
import { addDays, friendlyDate, todayKey } from '../../lib/dates';
import { summarizeDay } from '../../lib/reports';
import { useProfile, useStore } from '../../lib/store';
import { colors, MEAL_LABELS, MEAL_ORDER, spacing } from '../../theme';

export default function Diary() {
  const { state, removeExercise, setExtras, setWeight } = useStore();
  const profile = useProfile();
  const [date, setDate] = useState(todayKey());

  const day = summarizeDay(state, date);
  const weight = weightOn(state.weights, date, profile.startWeightKg);
  const goal = calorieGoal(profile, weight);
  const macros = macroGoals(goal.goal, profile.macroSplit);
  const budget = goal.goal + day.exerciseKcal;
  const remaining = budget - day.intake.kcal;
  const entries = state.diary.filter((e) => e.date === date);
  const exercises = state.exercises.filter((e) => e.date === date);
  const isToday = date === todayKey();

  return (
    <Screen>
      <Row style={{ justifyContent: 'space-between' }}>
        <Pressable onPress={() => setDate(addDays(date, -1))} hitSlop={12}>
          <Ionicons name="chevron-back" size={24} color={colors.primary} />
        </Pressable>
        <Pressable onPress={() => setDate(todayKey())}>
          <Text style={{ fontSize: 17, fontWeight: '700', color: colors.text }}>{friendlyDate(date)}</Text>
        </Pressable>
        <Pressable onPress={() => setDate(addDays(date, 1))} hitSlop={12} disabled={isToday}>
          <Ionicons name="chevron-forward" size={24} color={isToday ? colors.border : colors.primary} />
        </Pressable>
      </Row>

      <WeighIn
        key={date}
        isToday={isToday}
        logged={day.weightKg}
        last={weight}
        onSave={(kg) => setWeight({ ...state.weights.find((w) => w.date === date), date, kg })}
        onMore={() => router.push({ pathname: '/log-weight', params: { date } })}
      />

      <Card title="Kalorije">
        <Row style={{ justifyContent: 'center', gap: spacing.xl }}>
          <Ring value={day.intake.kcal} max={budget}>
            <Text style={{ fontSize: 28, fontWeight: '800', color: remaining < 0 ? colors.danger : colors.text }}>
              {fmt(Math.abs(remaining))}
            </Text>
            <Text style={styles.muted}>{remaining < 0 ? 'preko cilja' : 'preostalo'}</Text>
          </Ring>
          <View style={{ gap: spacing.sm }}>
            <Legend icon="flag-outline" label="Cilj" value={goal.goal} />
            <Legend icon="restaurant-outline" label="Hrana" value={day.intake.kcal} />
            <Legend icon="flame-outline" label="Vježba" value={day.exerciseKcal} color={colors.exercise} />
          </View>
        </Row>
        <View style={{ borderTopWidth: 1, borderColor: colors.border, paddingTop: spacing.sm, marginTop: spacing.xs }}>
          <Text style={styles.muted}>
            Potrošnja (TDEE + vježba): {fmt(day.burned)} kcal ·{' '}
            {day.logged ? (
              <Text style={{ color: day.deficit >= 0 ? colors.success : colors.danger, fontWeight: '700' }}>
                {isToday ? 'trenutno ' : ''}
                {day.deficit >= 0 ? `deficit ${fmt(day.deficit)} kcal` : `suficit ${fmt(-day.deficit)} kcal`}
              </Text>
            ) : (
              'još nema unosa'
            )}
          </Text>
        </View>
      </Card>

      <Card title="Makronutrijenti">
        <MacroRow label="Proteini" value={day.intake.protein} goal={macros.protein} color={colors.protein} />
        <MacroRow label="Ugljikohidrati" value={day.intake.carbs} goal={macros.carbs} color={colors.carbs} />
        <MacroRow label="Masti" value={day.intake.fat} goal={macros.fat} color={colors.fat} />
        <Row style={{ marginTop: spacing.xs }}>
          <Stat label="Vlakna" value={fmt(day.intake.fiber ?? 0)} unit="g" />
          <Stat label="Šećeri" value={fmt(day.intake.sugar ?? 0)} unit="g" />
          <Stat label="Zasić. masti" value={fmt(day.intake.saturatedFat ?? 0)} unit="g" />
          <Stat label="Sol" value={fmt(day.intake.salt ?? 0, 1)} unit="g" />
        </Row>
      </Card>

      {MEAL_ORDER.map((meal) => {
        const items = entries.filter((e) => e.meal === meal);
        const kcal = items.reduce((a, e) => a + e.nutrients.kcal, 0);
        return (
          <Card key={meal} title={MEAL_LABELS[meal]} right={<Text style={styles.muted}>{fmt(kcal)} kcal</Text>}>
            {items.map((e) => (
              <Pressable
                key={e.id}
                onPress={() => router.push({ pathname: '/food', params: { entryId: e.id } })}
                style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 }}
              >
                <View style={{ flex: 1, paddingRight: spacing.sm }}>
                  <Text style={styles.text} numberOfLines={1}>{e.name}</Text>
                  <Text style={[styles.muted, { fontSize: 12 }]}>
                    {e.brand ? `${e.brand} · ` : ''}{fmt(e.grams)} g · B {fmt(e.nutrients.protein)} · UH {fmt(e.nutrients.carbs)} · M {fmt(e.nutrients.fat)}
                  </Text>
                </View>
                <Text style={styles.text}>{fmt(e.nutrients.kcal)}</Text>
              </Pressable>
            ))}
            <Row>
              <Button
                title="+ Dodaj hranu"
                variant="secondary"
                style={{ flex: 1, paddingVertical: 9 }}
                onPress={() => router.push({ pathname: '/add-food', params: { date, meal } })}
              />
              <Pressable
                onPress={() => router.push({ pathname: '/scan', params: { date, meal } })}
                style={{ padding: 8, backgroundColor: colors.primarySoft, borderRadius: 10 }}
              >
                <Ionicons name="barcode-outline" size={22} color={colors.primary} />
              </Pressable>
            </Row>
          </Card>
        );
      })}

      <Card title="Vježba / aktivnost" right={<Text style={styles.muted}>{fmt(day.exerciseKcal)} kcal</Text>}>
        {exercises.map((e) => (
          <Pressable
            key={e.id}
            onLongPress={() =>
              Alert.alert('Obriši aktivnost?', e.name, [
                { text: 'Odustani', style: 'cancel' },
                { text: 'Obriši', style: 'destructive', onPress: () => removeExercise(e.id) },
              ])
            }
            style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 }}
          >
            <Text style={styles.text}>{e.name} · {e.minutes} min</Text>
            <Text style={[styles.text, { color: colors.exercise }]}>{fmt(e.kcal)}</Text>
          </Pressable>
        ))}
        {exercises.length > 0 && <Text style={[styles.muted, { fontSize: 12 }]}>Dugi pritisak za brisanje.</Text>}
        <Button
          title="+ Dodaj aktivnost"
          variant="secondary"
          style={{ paddingVertical: 9 }}
          onPress={() => router.push({ pathname: '/add-exercise', params: { date } })}
        />
      </Card>

      <Card title="Voda" right={<Text style={styles.muted}>{fmt(day.waterMl)} / {profile.waterGoalMl} ml</Text>}>
        <ProgressBar value={day.waterMl} max={profile.waterGoalMl} color={colors.water} />
        <Row>
          {[-250, 250, 500].map((ml) => (
            <Button
              key={ml}
              title={`${ml > 0 ? '+' : '−'}${Math.abs(ml)} ml`}
              variant="secondary"
              style={{ flex: 1, paddingVertical: 9 }}
              onPress={() => setExtras(date, { waterMl: Math.max(0, day.waterMl + ml) })}
            />
          ))}
        </Row>
      </Card>

      <Card title="Koraci" right={<Text style={styles.muted}>cilj {profile.stepsGoal}</Text>}>
        <ProgressBar value={day.steps} max={profile.stepsGoal} color={colors.success} />
        <StepsInput key={date} value={day.steps} onSave={(steps) => setExtras(date, { steps })} />
      </Card>

    </Screen>
  );
}

function Legend({ icon, label, value, color = colors.text }: {
  icon: React.ComponentProps<typeof Ionicons>['name'];
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <Row style={{ gap: spacing.sm }}>
      <Ionicons name={icon} size={18} color={colors.muted} />
      <View>
        <Text style={[styles.muted, { fontSize: 12 }]}>{label}</Text>
        <Text style={{ fontSize: 16, fontWeight: '700', color }}>{fmt(value)}</Text>
      </View>
    </Row>
  );
}

function MacroRow({ label, value, goal, color }: { label: string; value: number; goal: number; color: string }) {
  return (
    <View style={{ gap: 4 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <Text style={styles.text}>{label}</Text>
        <Text style={styles.muted}>{fmt(value)} / {goal} g</Text>
      </Row>
      <ProgressBar value={value} max={goal} color={color} />
    </View>
  );
}

function StepsInput({ value, onSave }: { value: number; onSave: (n: number) => void }) {
  const [text, setText] = useState(value ? String(value) : '');
  return (
    <Row>
      <TextInput
        value={text}
        onChangeText={setText}
        placeholder="Broj koraka"
        keyboardType="number-pad"
        onEndEditing={() => onSave(Math.max(0, Math.round(parseNum(text) || 0)))}
        style={{
          flex: 1,
          borderWidth: 1,
          borderColor: colors.border,
          borderRadius: 8,
          paddingHorizontal: 12,
          paddingVertical: 8,
          fontSize: 16,
          color: colors.text,
        }}
      />
      <Button title="Spremi" variant="secondary" style={{ paddingVertical: 8 }} onPress={() => onSave(Math.max(0, Math.round(parseNum(text) || 0)))} />
    </Row>
  );
}

function WeighIn({ isToday, logged, last, onSave, onMore }: {
  isToday: boolean;
  logged?: number;
  last: number;
  onSave: (kg: number) => void;
  onMore: () => void;
}) {
  const [text, setText] = useState('');
  const [editing, setEditing] = useState(false);
  const save = () => {
    const kg = parseNum(text);
    if (!(kg > 30 && kg < 350)) return Alert.alert('Težina', 'Unesi ispravnu težinu u kg.');
    onSave(kg);
    setText('');
    setEditing(false);
  };
  const missing = logged === undefined;
  return (
    <Card
      title={isToday ? 'Današnje vaganje' : 'Vaganje'}
      right={<Pressable onPress={onMore}><Text style={{ color: colors.primary }}>Struk / % masti</Text></Pressable>}
      style={missing && isToday ? { borderWidth: 1.5, borderColor: colors.warning } : undefined}
    >
      <Row style={{ alignItems: 'flex-start' }}>
        <Ionicons name="information-circle-outline" size={18} color={colors.muted} />
        <Text style={[styles.muted, { flex: 1, fontSize: 13 }]}>{WEIGH_IN_TIP}</Text>
      </Row>
      {!missing && !editing ? (
        <Row style={{ justifyContent: 'space-between' }}>
          <Text style={{ fontSize: 22, fontWeight: '800', color: colors.text }}>
            {fmt(logged, 1)} kg{' '}
            <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          </Text>
          <Button title="Promijeni" variant="secondary" style={{ paddingVertical: 8 }} onPress={() => { setText(String(logged).replace('.', ',')); setEditing(true); }} />
        </Row>
      ) : (
        <Row>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder={`npr. ${fmt(last, 1)}`}
            placeholderTextColor={colors.muted}
            keyboardType="decimal-pad"
            onSubmitEditing={save}
            style={{
              flex: 1,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 8,
              fontSize: 18,
              color: colors.text,
            }}
          />
          <Text style={styles.muted}>kg</Text>
          <Button title="Spremi" style={{ paddingVertical: 9 }} onPress={save} disabled={!text.trim()} />
        </Row>
      )}
      {missing && isToday && <Text style={{ color: colors.warning, fontSize: 12 }}>Danas još nisi izvagan.</Text>}
    </Card>
  );
}
