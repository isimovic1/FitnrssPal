import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Alert, Image, Text, View } from 'react-native';

import { Button, Card, Field, fmt, parseNum, Row, Screen, Segmented, Stat, styles } from '../components/ui';
import { scaleNutrients } from '../lib/calc';
import { todayKey } from '../lib/dates';
import { findFood } from '../lib/foodCache';
import { useStore } from '../lib/store';
import type { Food, MealType } from '../lib/types';
import { colors, MEAL_LABELS, MEAL_ORDER, spacing } from '../theme';

type Unit = 'g' | 'serving';

export default function FoodScreen() {
  const params = useLocalSearchParams<{ foodId?: string; entryId?: string; date?: string; meal?: MealType }>();
  const { state, addFood, updateEntry, removeEntry } = useStore();
  const entry = params.entryId ? state.diary.find((e) => e.id === params.entryId) : undefined;
  const food: Food | undefined = entry
    ? findFood(state, entry.foodId) ?? {
        id: entry.foodId,
        name: entry.name,
        brand: entry.brand,
        per100g: scaleNutrients(entry.nutrients, 10000 / entry.grams),
        source: 'custom',
      }
    : params.foodId
      ? findFood(state, params.foodId)
      : undefined;

  const hasServing = !!food?.servingSizeG;
  const [unit, setUnit] = useState<Unit>(entry || !hasServing ? 'g' : 'serving');
  const [amount, setAmount] = useState(entry ? String(Math.round(entry.grams)) : hasServing ? '1' : '100');
  const [meal, setMeal] = useState<MealType>(entry?.meal ?? params.meal ?? 'snack');

  if (!food) {
    return (
      <Screen>
        <Text style={styles.muted}>Namirnica nije pronađena.</Text>
      </Screen>
    );
  }

  const qty = parseNum(amount);
  const grams = unit === 'serving' && food.servingSizeG ? qty * food.servingSizeG : qty;
  const valid = Number.isFinite(grams) && grams > 0 && grams < 10000;
  const n = scaleNutrients(food.per100g, valid ? grams : 0);

  const save = () => {
    if (!valid) {
      Alert.alert('Neispravna količina', 'Unesi količinu veću od nule.');
      return;
    }
    if (entry) updateEntry(entry.id, grams, meal);
    else addFood(food, params.date ?? todayKey(), meal, grams);
    router.dismissTo('/');
  };

  const remove = () =>
    Alert.alert('Obriši unos?', food.name, [
      { text: 'Odustani', style: 'cancel' },
      {
        text: 'Obriši',
        style: 'destructive',
        onPress: () => {
          removeEntry(entry!.id);
          router.back();
        },
      },
    ]);

  return (
    <Screen>
      <Card>
        <Row>
          {food.imageUrl ? (
            <Image source={{ uri: food.imageUrl }} style={{ width: 56, height: 56, borderRadius: 8 }} resizeMode="contain" />
          ) : null}
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 19, fontWeight: '700', color: colors.text }}>{food.name}</Text>
            {food.brand ? <Text style={styles.muted}>{food.brand}</Text> : null}
            {food.barcode ? <Text style={[styles.muted, { fontSize: 12 }]}>Bar-kod: {food.barcode}</Text> : null}
          </View>
        </Row>
      </Card>

      <Card title="Količina">
        {hasServing && (
          <Segmented
            options={[
              { value: 'serving', label: `Porcija (${food.servingLabel ?? `${food.servingSizeG} g`})` },
              { value: 'g', label: 'Grami' },
            ]}
            value={unit}
            onChange={(u) => {
              if (u === unit) return;
              const q = parseNum(amount);
              if (Number.isFinite(q) && food.servingSizeG) {
                setAmount(u === 'g' ? String(Math.round(q * food.servingSizeG)) : fmt(q / food.servingSizeG, 2));
              }
              setUnit(u);
            }}
          />
        )}
        <Field
          label={unit === 'g' ? 'Grami (ili ml)' : 'Broj porcija'}
          suffix={unit === 'g' ? 'g' : `× ${food.servingSizeG} g`}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          selectTextOnFocus
        />
        <Text style={styles.label}>Obrok</Text>
        <Segmented options={MEAL_ORDER.map((m) => ({ value: m, label: MEAL_LABELS[m] }))} value={meal} onChange={setMeal} />
      </Card>

      <Card title={`Nutritivne vrijednosti${valid ? ` (${fmt(grams)} g)` : ''}`}>
        <Row>
          <Stat label="kcal" value={fmt(n.kcal)} color={colors.primary} />
          <Stat label="Proteini" value={fmt(n.protein, 1)} unit="g" color={colors.protein} />
          <Stat label="UH" value={fmt(n.carbs, 1)} unit="g" color={colors.carbs} />
          <Stat label="Masti" value={fmt(n.fat, 1)} unit="g" color={colors.fat} />
        </Row>
        <View style={{ gap: 4, marginTop: spacing.sm }}>
          <NutrientLine label="Šećeri" value={n.sugar} per100={food.per100g.sugar} />
          <NutrientLine label="Vlakna" value={n.fiber} per100={food.per100g.fiber} />
          <NutrientLine label="Zasićene masti" value={n.saturatedFat} per100={food.per100g.saturatedFat} />
          <NutrientLine label="Sol" value={n.salt} per100={food.per100g.salt} />
          <Text style={[styles.muted, { fontSize: 12, marginTop: 4 }]}>
            Na 100 g: {fmt(food.per100g.kcal)} kcal · B {fmt(food.per100g.protein, 1)} · UH {fmt(food.per100g.carbs, 1)} · M{' '}
            {fmt(food.per100g.fat, 1)}
          </Text>
        </View>
      </Card>

      <Button title={entry ? 'Spremi promjene' : 'Dodaj u dnevnik'} onPress={save} disabled={!valid} />
      {entry && <Button title="Obriši unos" variant="danger" onPress={remove} />}
    </Screen>
  );
}

function NutrientLine({ label, value, per100 }: { label: string; value?: number; per100?: number }) {
  if (per100 === undefined) return null;
  return (
    <Row style={{ justifyContent: 'space-between' }}>
      <Text style={styles.text}>{label}</Text>
      <Text style={styles.text}>{fmt(value ?? 0, 1)} g</Text>
    </Row>
  );
}
