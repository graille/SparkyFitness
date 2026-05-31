import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, Text, Switch, ScrollView } from 'react-native';
import Animated, { LinearTransition } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';

import Button from '../components/ui/Button';
import Icon from '../components/Icon';
import BottomSheetPicker from '../components/BottomSheetPicker';
import FormInput from '../components/FormInput';
import { useActiveWorkoutBarPadding } from '../components/ActiveWorkoutBar';
import { usePreferences } from '../hooks/usePreferences';
import { updatePreferences } from '../services/api/preferencesApi';
import { preferencesQueryKey } from '../hooks/queryKeys';
import type { UserPreferences } from '../types/preferences';
import type { RootStackScreenProps } from '../types/navigation';

type CalorieSettingsScreenProps = RootStackScreenProps<'CalorieSettings'>;

function normalizePreferences(prefs: UserPreferences | undefined) {
  const raw = prefs?.calorie_goal_adjustment_mode;
  return {
    mode: !raw ? 'dynamic' : raw === 'smart' ? 'tdee' : raw,
    activityLevel: prefs?.activity_level ?? 'not_much',
    exerciseCaloriePercentage: prefs?.exercise_calorie_percentage ?? 100,
    includeBmrInNetCalories: prefs?.include_bmr_in_net_calories ?? false,
    tdeeAllowNegativeAdjustment: prefs?.tdee_allow_negative_adjustment ?? false,
  };
}

const CalorieSettingsScreen: React.FC<CalorieSettingsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeWorkoutBarPadding = useActiveWorkoutBarPadding('stack');
  const [accentPrimary, formEnabled, formDisabled] = useCSSVariable([
    '--color-accent-primary',
    '--color-form-enabled',
    '--color-form-disabled',
  ]) as [string, string, string];

  const queryClient = useQueryClient();
  const { preferences } = usePreferences();
  const normalized = normalizePreferences(preferences);

  const modeOptions = [
    { label: t('screens.calorieSettings.modeAdaptiveTdee'), value: 'adaptive' },
    { label: t('screens.calorieSettings.modeDynamicGoal'), value: 'dynamic' },
    { label: t('screens.calorieSettings.modeFixedGoal'), value: 'fixed' },
    { label: t('screens.calorieSettings.modePercentageEarnBack'), value: 'percentage' },
    { label: t('screens.calorieSettings.modeDeviceProjection'), value: 'tdee' },
  ];

  const activityLevelOptions = [
    { label: t('screens.calorieSettings.activityLevelSedentary'), value: 'not_much' },
    { label: t('screens.calorieSettings.activityLevelLightlyActive'), value: 'light' },
    { label: t('screens.calorieSettings.activityLevelModeratelyActive'), value: 'moderate' },
    { label: t('screens.calorieSettings.activityLevelVeryActive'), value: 'heavy' },
  ];

  const [percentageText, setPercentageText] = useState(
    () => String(normalized.exerciseCaloriePercentage),
  );

  useEffect(() => {
    setPercentageText(String(normalized.exerciseCaloriePercentage));
  }, [normalized.exerciseCaloriePercentage]);

  const mutation = useMutation({
    mutationFn: (data: Partial<UserPreferences>) => updatePreferences(data),
    onMutate: async (data) => {
      await queryClient.cancelQueries({ queryKey: preferencesQueryKey });
      const previous = queryClient.getQueryData<UserPreferences>(preferencesQueryKey);
      queryClient.setQueryData<UserPreferences>(preferencesQueryKey, (old) =>
        old ? { ...old, ...data } : data as UserPreferences,
      );
      return { previous };
    },
    onError: (_err, _data, context) => {
      if (context?.previous) {
        queryClient.setQueryData(preferencesQueryKey, context.previous);
      }
      Toast.show({ type: 'error', text1: t('common.error'), text2: t('screens.calorieSettings.failedToUpdateSetting') });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dailySummary'] });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: preferencesQueryKey });
    },
  });

  const handleModeChange = useCallback((value: string) => {
    mutation.mutate({ calorie_goal_adjustment_mode: value });
  }, [mutation]);

  const handleActivityLevelChange = useCallback((value: string) => {
    mutation.mutate({ activity_level: value });
  }, [mutation]);

  const handleBmrToggle = useCallback((value: boolean) => {
    mutation.mutate({ include_bmr_in_net_calories: value });
  }, [mutation]);

  const handleNegativeAdjustmentToggle = useCallback((value: boolean) => {
    mutation.mutate({ tdee_allow_negative_adjustment: value });
  }, [mutation]);

  const handlePercentageBlur = useCallback(() => {
    const parsed = parseInt(percentageText, 10);
    const clamped = isNaN(parsed) ? 100 : Math.max(0, Math.min(100, parsed));
    setPercentageText(String(clamped));
    if (clamped !== normalized.exerciseCaloriePercentage) {
      mutation.mutate({ exercise_calorie_percentage: clamped });
    }
  }, [percentageText, normalized.exerciseCaloriePercentage, mutation]);


  const optionsLayout = LinearTransition.delay(0).duration(250);
  const pipelineLayout = LinearTransition.delay(50).duration(250);

  const showPercentage = normalized.mode === 'percentage';
  const showActivityLevel = normalized.mode === 'tdee' || normalized.mode === 'adaptive';
  const showNegativeAdjustment = normalized.mode === 'tdee';

  const explanation = useMemo(() => {
    const mode = normalized.mode;
    const bmr = normalized.includeBmrInNetCalories;
    const pct = normalized.exerciseCaloriePercentage;

    const burned = bmr
      ? t('screens.calorieSettings.burnedActivityAndBmr')
      : t('screens.calorieSettings.burnedActivityOnly');

    const net = t('screens.calorieSettings.netEnergyFormula');

    let remainingFormula: string;
    let remainingNote: string | null;
    switch (mode) {
      case 'dynamic':
        remainingFormula = t('screens.calorieSettings.remainingFormulaDynamic');
        remainingNote = t('screens.calorieSettings.remainingNoteDynamic');
        break;
      case 'percentage':
        remainingFormula = bmr
          ? `Goal − Eaten + BMR + ${pct}% of Exercise`
          : `Goal − Eaten + ${pct}% of Exercise`;
        remainingNote = null;
        break;
      case 'tdee':
        remainingFormula = t('screens.calorieSettings.remainingFormulaTdee');
        remainingNote = t('screens.calorieSettings.remainingNoteTdee');
        break;
      case 'adaptive':
        remainingFormula = t('screens.calorieSettings.remainingFormulaAdaptive');
        remainingNote = t('screens.calorieSettings.remainingNoteAdaptive');
        break;
      default:
        remainingFormula = t('screens.calorieSettings.remainingFormulaFixed');
        remainingNote = t('screens.calorieSettings.remainingNoteFixed');
        break;
    }

    return { burned, net, remainingFormula, remainingNote };
  }, [normalized.mode, normalized.includeBmrInNetCalories, normalized.exerciseCaloriePercentage, t]);

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{ padding: 16, paddingTop: 16, paddingBottom: insets.bottom + 80 + activeWorkoutBarPadding }}
        contentInsetAdjustmentBehavior="never"
      >
        {/* Header */}
        <View className="flex-row items-center mb-4">
          <Button
            variant="ghost"
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="py-0 px-0 mr-2"
          >
            <Icon name="chevron-back" size={22} color={accentPrimary} />
          </Button>
          <Text className="text-2xl font-bold text-text-primary">{t('screens.calorieSettings.title')}</Text>
        </View>

        {/* Mode */}
        <View className="bg-surface rounded-xl p-3 mb-4 shadow-sm">
          <View className="flex-row items-center justify-between">
            <Text className="text-base font-semibold text-text-primary">{t('screens.calorieSettings.calorieModeLabel')}</Text>
            <BottomSheetPicker
              value={normalized.mode}
              options={modeOptions}
              onSelect={handleModeChange}
              title={t('screens.calorieSettings.adjustmentModePickerTitle')}
              containerStyle={{ flex: 1, maxWidth: 200, marginLeft: 16 }}
            />
          </View>
          <Text className="text-text-secondary text-sm mt-3">
            {t('screens.calorieSettings.calorieModeDescription')}
          </Text>
        </View>

        {/* Options */}
        <Animated.View className="bg-surface rounded-xl p-4 mb-4 shadow-sm" layout={optionsLayout}>
          {/* Percentage Input */}
          {showPercentage && (
            <Animated.View layout={optionsLayout}>
              <Text className="text-base font-semibold text-text-primary mb-2">
                {t('screens.calorieSettings.exerciseCaloriesAppliedLabel')}
              </Text>
              <FormInput
                value={percentageText}
                onChangeText={setPercentageText}
                onBlur={handlePercentageBlur}
                keyboardType="number-pad"
                maxLength={3}
                returnKeyType="done"
              />
              <Text className="text-text-secondary text-sm mt-3">
                {t('screens.calorieSettings.exerciseCaloriesAppliedDescription')}
              </Text>
              <View className="border-t border-border-subtle my-3" />
            </Animated.View>
          )}

          {/* Activity Level */}
          {showActivityLevel && (
            <Animated.View layout={optionsLayout}>
              <View className="flex-row items-center justify-between">
                <Text className="text-base font-semibold text-text-primary">{t('screens.calorieSettings.activityLevelLabel')}</Text>
                <BottomSheetPicker
                  value={normalized.activityLevel}
                  options={activityLevelOptions}
                  onSelect={handleActivityLevelChange}
                  title={t('screens.calorieSettings.activityLevelPickerTitle')}
                  containerStyle={{ flex: 1, maxWidth: 200, marginLeft: 16 }}
                />
              </View>
              <Text className="text-text-secondary text-sm mt-1">
                {t('screens.calorieSettings.activityLevelBaselineDescription')}
              </Text>
              {normalized.mode === 'adaptive' && (
                <Text className="text-text-secondary text-sm mt-3">
                  {t('screens.calorieSettings.activityLevelFallbackDescription')}
                </Text>
              )}
              <View className="border-t border-border-subtle my-3" />
            </Animated.View>
          )}

          {/* Negative Adjustment Toggle */}
          {showNegativeAdjustment && (
            <Animated.View layout={optionsLayout}>
              <View className="flex-row justify-between items-center">
                <Text className="text-base font-semibold text-text-primary">{t('screens.calorieSettings.allowNegativeAdjustmentLabel')}</Text>
                <Switch
                  onValueChange={handleNegativeAdjustmentToggle}
                  value={normalized.tdeeAllowNegativeAdjustment}
                  trackColor={{ false: formDisabled, true: formEnabled }}
                  thumbColor="#FFFFFF"
                />
              </View>
              <Text className="text-text-secondary text-sm mt-3">
                {t('screens.calorieSettings.allowNegativeAdjustmentDescription')}
              </Text>
              <View className="border-t border-border-subtle my-3" />
            </Animated.View>
          )}

          {/* BMR Toggle */}
          <Animated.View layout={optionsLayout}>
            <View className="flex-row justify-between items-center">
              <Text className="text-base font-semibold text-text-primary">{t('screens.calorieSettings.includeRestingCaloriesLabel')}</Text>
              <Switch
                onValueChange={handleBmrToggle}
                value={normalized.includeBmrInNetCalories}
                trackColor={{ false: formDisabled, true: formEnabled }}
                thumbColor="#FFFFFF"
              />
            </View>
            <Text className="text-text-secondary text-sm mt-3">
              {t('screens.calorieSettings.includeRestingCaloriesDescription')}
            </Text>
          </Animated.View>
        </Animated.View>

        {/* Calculation Pipeline */}
        <Animated.View
          className="rounded-xl p-4 mb-4"
          layout={pipelineLayout}
          style={{ backgroundColor: `${accentPrimary}15`}}
        >
          <View className="flex-row items-center mb-4">
            <Icon name="info-circle" size={18} color={accentPrimary} />
            <Text className="text-base font-semibold text-text-primary ml-2">
              {t('screens.calorieSettings.howThisWorksTitle')}
            </Text>
          </View>

          <Animated.View className="items-center" layout={pipelineLayout}>
            {/* Step 1: Burned */}
            <Text className="text-base font-semibold text-text-primary">{t('screens.calorieSettings.burnedCaloriesLabel')}</Text>
            <Animated.View
              key={`burned-${explanation.burned}`}
              layout={pipelineLayout}
            >
              <Text className="text-sm text-text-secondary">{explanation.burned}</Text>
            </Animated.View>

            <Text className="text-text-muted text-lg my-1">{'↓'}</Text>

            {/* Step 2: Net */}
            <Text className="text-base font-semibold text-text-primary">{t('screens.calorieSettings.netEnergyLabel')}</Text>
            <Animated.View
              key={`net-${explanation.net}`}
              layout={pipelineLayout}
            >
              <Text className="text-sm text-text-secondary">{explanation.net}</Text>
            </Animated.View>

            <Text className="text-text-muted text-lg my-1">{'↓'}</Text>

            {/* Step 3: Remaining */}
            <Text className="text-base font-semibold text-text-primary">{t('screens.calorieSettings.remainingCaloriesLabel')}</Text>
            <Animated.View
              key={`remaining-${explanation.remainingFormula}`}
              layout={pipelineLayout}
            >
              <Text className="text-sm text-text-secondary">{explanation.remainingFormula}</Text>
            </Animated.View>
            {explanation.remainingNote && (
              <Animated.View
                key={`note-${explanation.remainingNote}`}
                layout={pipelineLayout}
              >
                <Text className="text-sm text-text-secondary mt-2 italic">({explanation.remainingNote})</Text>
              </Animated.View>
            )}
          </Animated.View>
        </Animated.View>
      </ScrollView>
    </View>
  );
};

export default CalorieSettingsScreen;
