import Ionicons from '@expo/vector-icons/Ionicons';
import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Pressable, Text, TextInput, View } from 'react-native';

import { Button, fmt, Row, Segmented, styles } from '../components/ui';
import { todayKey } from '../lib/dates';
import { rememberFood } from '../lib/foodCache';
import { BUILTIN_FOODS, matchesQuery } from '../lib/foods';
import { searchProducts } from '../lib/openFoodFacts';
import { useStore } from '../lib/store';
import type { Food, MealType } from '../lib/types';
import { colors, MEAL_LABELS, spacing } from '../theme';

type Tab = 'mine' | 'online';

export default function AddFood() {
  const params = useLocalSearchParams<{ date?: string; meal?: MealType }>();
  const date = params.date ?? todayKey();
  const meal = params.meal ?? 'snack';
  const { state } = useStore();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<Tab>('mine');
  const [online, setOnline] = useState<Food[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const local = useMemo(() => {
    const recent = state.recentFoodIds.map((id) => state.foods[id]).filter((f): f is Food => !!f);
    const seen = new Set(recent.map((f) => f.id));
    const saved = Object.values(state.foods).filter((f) => !seen.has(f.id));
    return [...recent, ...saved, ...BUILTIN_FOODS].filter((f) => matchesQuery(f, query));
  }, [state.foods, state.recentFoodIds, query]);

  const searchOnline = async () => {
    if (!query.trim()) return;
    setTab('online');
    setLoading(true);
    setError(null);
    try {
      setOnline(await searchProducts(query.trim()));
    } catch (e) {
      const detail = e instanceof Error ? e.message : String(e);
      setError(`Pretraga nije uspjela (${detail}). Provjeri internetsku vezu ili pokušaj kasnije.`);
    } finally {
      setLoading(false);
    }
  };

  const open = (food: Food) => {
    rememberFood(food);
    router.push({ pathname: '/food', params: { foodId: food.id, date, meal } });
  };

  const data = tab === 'mine' ? local : online;

  return (
    <View style={{ flex: 1, backgroundColor: colors.bg, padding: spacing.lg, gap: spacing.md }}>
      <Text style={styles.muted}>Dodaješ u: {MEAL_LABELS[meal]}</Text>
      <Row>
        <View style={[styles.inputRow, { flex: 1 }]}>
          <Ionicons name="search" size={18} color={colors.muted} />
          <TextInput
            value={query}
            onChangeText={setQuery}
            placeholder="Pretraži namirnice…"
            placeholderTextColor={colors.muted}
            style={[styles.input, { marginLeft: 6 }]}
            returnKeyType="search"
            onSubmitEditing={searchOnline}
          />
        </View>
        <Pressable
          onPress={() => router.push({ pathname: '/scan', params: { date, meal } })}
          style={{ padding: 10, backgroundColor: colors.primary, borderRadius: 10 }}
        >
          <Ionicons name="barcode-outline" size={22} color="#fff" />
        </Pressable>
      </Row>
      <Segmented
        options={[
          { value: 'mine', label: 'Moje i česte' },
          { value: 'online', label: 'Online baza' },
        ]}
        value={tab}
        onChange={(t) => {
          setTab(t);
          if (t === 'online' && online.length === 0) searchOnline();
        }}
      />
      {tab === 'online' && loading && <ActivityIndicator color={colors.primary} />}
      {tab === 'online' && error && <Text style={{ color: colors.danger }}>{error}</Text>}
      {tab === 'online' && !loading && !error && online.length === 0 && (
        <Text style={styles.muted}>
          {query.trim() ? 'Nema rezultata. Pokušaj drugi naziv ili skeniraj bar-kod.' : 'Upiši naziv proizvoda i pritisni traži.'}
        </Text>
      )}
      <FlatList
        data={data}
        keyExtractor={(f) => f.id}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ gap: spacing.sm, paddingBottom: 40 }}
        renderItem={({ item }) => <FoodRow food={item} onPress={() => open(item)} />}
        ListFooterComponent={
          <View style={{ gap: spacing.sm, marginTop: spacing.sm }}>
            {tab === 'mine' && query.trim().length > 1 && (
              <Button title={`Traži "${query.trim()}" online`} variant="secondary" onPress={searchOnline} />
            )}
            <Button
              title="+ Nova vlastita namirnica"
              variant="ghost"
              onPress={() => router.push({ pathname: '/custom-food', params: { date, meal } })}
            />
          </View>
        }
      />
    </View>
  );
}

function FoodRow({ food, onPress }: { food: Food; onPress: () => void }) {
  const serving = food.servingSizeG ? ` · ${food.servingLabel ?? `${food.servingSizeG} g`}` : '';
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        backgroundColor: pressed ? colors.primarySoft : colors.card,
        borderRadius: 12,
        padding: spacing.md,
        flexDirection: 'row',
        alignItems: 'center',
      })}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.text} numberOfLines={1}>{food.name}</Text>
        <Text style={[styles.muted, { fontSize: 12 }]} numberOfLines={1}>
          {food.brand ? `${food.brand} · ` : ''}
          {fmt(food.per100g.kcal)} kcal / 100 g{serving}
        </Text>
      </View>
      {food.barcode && <Ionicons name="barcode-outline" size={16} color={colors.muted} style={{ marginRight: 6 }} />}
      <Ionicons name="add-circle" size={26} color={colors.primary} />
    </Pressable>
  );
}
