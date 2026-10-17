import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';

import { ACTIVITY_LABELS, calorieGoal, macroGoals } from '../lib/calc';
import type { ActivityLevel, Profile, Sex } from '../lib/types';
import { colors, spacing } from '../theme';
import { Button, Card, Field, fmt, parseNum, Row, Segmented, styles } from './ui';

const WEEKLY_OPTIONS = [
  { value: '-1', label: '−1 kg' },
  { value: '-0.75', label: '−0,75' },
  { value: '-0.5', label: '−0,5' },
  { value: '-0.25', label: '−0,25' },
  { value: '0', label: 'Održ.' },
  { value: '0.25', label: '+0,25' },
  { value: '0.5', label: '+0,5' },
];

const str = (n: number | undefined) => (n === undefined ? '' : String(n).replace('.', ','));

export function ProfileForm({ initial, currentWeightKg, submitLabel, onSubmit }: {
  initial?: Profile;
  currentWeightKg?: number;
  submitLabel: string;
  onSubmit: (p: Profile) => void;
}) {
  const [name, setName] = useState(initial?.name ?? '');
  const [sex, setSex] = useState<Sex>(initial?.sex ?? 'male');
  const [birthYear, setBirthYear] = useState(str(initial?.birthYear));
  const [height, setHeight] = useState(str(initial?.heightCm));
  const [startWeight, setStartWeight] = useState(str(initial?.startWeightKg));
  const [goalWeight, setGoalWeight] = useState(str(initial?.goalWeightKg));
  const [activity, setActivity] = useState<ActivityLevel>(initial?.activityLevel ?? 'light');
  const [weekly, setWeekly] = useState(String(initial?.weeklyGoalKg ?? -0.5));
  const [protein, setProtein] = useState(str(initial?.macroSplit.protein ?? 30));
  const [carbs, setCarbs] = useState(str(initial?.macroSplit.carbs ?? 40));
  const [fat, setFat] = useState(str(initial?.macroSplit.fat ?? 30));
  const [water, setWater] = useState(str(initial?.waterGoalMl ?? 2500));
  const [steps, setSteps] = useState(str(initial?.stepsGoal ?? 8000));
  const [custom, setCustom] = useState(str(initial?.customCalorieGoal));

  const build = (): Profile | string => {
    const p: Profile = {
      name: name.trim(),
      sex,
      birthYear: parseNum(birthYear),
      heightCm: parseNum(height),
      startWeightKg: parseNum(startWeight),
      goalWeightKg: parseNum(goalWeight),
      activityLevel: activity,
      weeklyGoalKg: parseFloat(weekly),
      macroSplit: { protein: parseNum(protein), carbs: parseNum(carbs), fat: parseNum(fat) },
      waterGoalMl: parseNum(water) || 2500,
      stepsGoal: parseNum(steps) || 8000,
      customCalorieGoal: custom.trim() ? parseNum(custom) : undefined,
      createdAt: initial?.createdAt ?? new Date().toISOString(),
    };
    const year = new Date().getFullYear();
    if (!(p.birthYear > year - 110 && p.birthYear < year - 10)) return 'Unesi ispravnu godinu rođenja.';
    if (!(p.heightCm > 100 && p.heightCm < 250)) return 'Unesi visinu u cm (100–250).';
    if (!(p.startWeightKg > 30 && p.startWeightKg < 350)) return 'Unesi početnu težinu u kg.';
    if (!(p.goalWeightKg > 30 && p.goalWeightKg < 350)) return 'Unesi ciljanu težinu u kg.';
    const sum = p.macroSplit.protein + p.macroSplit.carbs + p.macroSplit.fat;
    if (Math.round(sum) !== 100) return `Postoci makronutrijenata moraju davati 100 % (sada ${fmt(sum)} %).`;
    if (p.customCalorieGoal !== undefined && !(p.customCalorieGoal >= 800 && p.customCalorieGoal <= 6000))
      return 'Vlastiti kalorijski cilj mora biti između 800 i 6000 kcal.';
    return p;
  };

  const preview = build();
  const goal = typeof preview === 'object' ? calorieGoal(preview, currentWeightKg ?? preview.startWeightKg) : null;
  const macros = goal && typeof preview === 'object' ? macroGoals(goal.goal, preview.macroSplit) : null;

  const submit = () => {
    const p = build();
    if (typeof p === 'string') Alert.alert('Provjeri podatke', p);
    else onSubmit(p);
  };

  return (
    <View style={{ gap: spacing.md }}>
      <Card title="O tebi">
        <Field label="Ime (nije obavezno)" value={name} onChangeText={setName} />
        <Text style={styles.label}>Spol</Text>
        <Segmented
          options={[{ value: 'male', label: 'Muško' }, { value: 'female', label: 'Žensko' }]}
          value={sex}
          onChange={setSex}
        />
        <Row>
          <Field label="Godina rođenja" value={birthYear} onChangeText={setBirthYear} keyboardType="number-pad" />
          <Field label="Visina" suffix="cm" value={height} onChangeText={setHeight} keyboardType="decimal-pad" />
        </Row>
        <Row>
          <Field label="Početna težina" suffix="kg" value={startWeight} onChangeText={setStartWeight} keyboardType="decimal-pad" />
          <Field label="Ciljana težina" suffix="kg" value={goalWeight} onChangeText={setGoalWeight} keyboardType="decimal-pad" />
        </Row>
      </Card>

      <Card title="Razina aktivnosti">
        {(Object.keys(ACTIVITY_LABELS) as ActivityLevel[]).map((a) => (
          <Pressable
            key={a}
            onPress={() => setActivity(a)}
            style={{
              padding: spacing.md,
              borderRadius: 10,
              borderWidth: 1.5,
              borderColor: activity === a ? colors.primary : colors.border,
              backgroundColor: activity === a ? colors.primarySoft : '#fff',
            }}
          >
            <Text style={styles.text}>{ACTIVITY_LABELS[a]}</Text>
          </Pressable>
        ))}
      </Card>

      <Card title="Tjedni cilj">
        <Text style={styles.muted}>Promjena težine tjedno. Za mršavljenje preporučeno 0,25–0,75 kg.</Text>
        <Segmented options={WEEKLY_OPTIONS} value={weekly} onChange={setWeekly} />
        <Field
          label="Vlastiti dnevni kalorijski cilj (prazno = automatski)"
          suffix="kcal"
          value={custom}
          onChangeText={setCustom}
          keyboardType="number-pad"
        />
      </Card>

      <Card title="Makronutrijenti (% kalorija)">
        <Row>
          <Field label="Proteini" suffix="%" value={protein} onChangeText={setProtein} keyboardType="number-pad" />
          <Field label="UH" suffix="%" value={carbs} onChangeText={setCarbs} keyboardType="number-pad" />
          <Field label="Masti" suffix="%" value={fat} onChangeText={setFat} keyboardType="number-pad" />
        </Row>
      </Card>

      <Card title="Dodatni dnevni ciljevi">
        <Row>
          <Field label="Voda" suffix="ml" value={water} onChangeText={setWater} keyboardType="number-pad" />
          <Field label="Koraci" value={steps} onChangeText={setSteps} keyboardType="number-pad" />
        </Row>
      </Card>

      {goal && macros && (
        <Card title="Tvoj plan" style={{ backgroundColor: colors.primarySoft }}>
          <Text style={styles.text}>BMR (bazalni metabolizam): {goal.bmr} kcal</Text>
          <Text style={styles.text}>Održavanje (TDEE): {goal.tdee} kcal</Text>
          <Text style={[styles.text, { fontWeight: '700' }]}>Dnevni cilj: {goal.goal} kcal</Text>
          <Text style={styles.text}>
            {goal.plannedDeficit >= 0
              ? `Kalorijski deficit: ${goal.plannedDeficit} kcal/dan`
              : `Kalorijski suficit: ${-goal.plannedDeficit} kcal/dan`}
          </Text>
          <Text style={styles.text}>
            Proteini {macros.protein} g · UH {macros.carbs} g · Masti {macros.fat} g
          </Text>
          {goal.clamped && (
            <Text style={{ color: colors.warning }}>
              Cilj je podignut na sigurni minimum. Za brži tempo posavjetuj se s liječnikom.
            </Text>
          )}
        </Card>
      )}

      <Button title={submitLabel} onPress={submit} />
    </View>
  );
}
