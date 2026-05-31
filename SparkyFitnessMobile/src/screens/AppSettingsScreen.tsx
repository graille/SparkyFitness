import React from 'react';
import { View, Text, ScrollView, Switch } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';
import { useTranslation } from 'react-i18next';

import Button from '../components/ui/Button';
import Icon from '../components/Icon';
import BottomSheetPicker from '../components/BottomSheetPicker';
import { useActiveWorkoutBarPadding } from '../components/ActiveWorkoutBar';
import {
  useThemePreference,
  setThemePreference,
  type ThemePreference,
} from '../services/themeService';
import { useHapticsEnabled, setHapticsEnabled } from '../services/haptics';
import { useSoundsEnabled, setSoundsEnabled } from '../services/sounds';
import {
  useSelectedLanguage,
  setLanguage,
  SUPPORTED_LANGUAGES,
  type SupportedLanguage,
} from '../services/languageService';
import i18n from '../i18n';
import type { RootStackScreenProps } from '../types/navigation';

type AppSettingsScreenProps = RootStackScreenProps<'AppSettings'>;

const AppSettingsScreen: React.FC<AppSettingsScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeWorkoutBarPadding = useActiveWorkoutBarPadding('stack');
  const [accentPrimary, formEnabled, formDisabled] = useCSSVariable([
    '--color-accent-primary',
    '--color-form-enabled',
    '--color-form-disabled',
  ]) as [string, string, string];

  const appTheme = useThemePreference();
  const hapticsEnabled = useHapticsEnabled();
  const soundsEnabled = useSoundsEnabled();
  const selectedLanguage = useSelectedLanguage();

  const themeOptions: { label: string; value: ThemePreference }[] = [
    { label: t('screens.appSettings.themeLight'), value: 'Light' },
    { label: t('screens.appSettings.themeDark'), value: 'Dark' },
    { label: t('screens.appSettings.themeAmoled'), value: 'Amoled' },
    { label: t('screens.appSettings.themeSystem'), value: 'System' },
  ];

  const languageOptions: { label: string; value: SupportedLanguage }[] = SUPPORTED_LANGUAGES.map(
    (lng) => ({
      label: (i18n.getResourceBundle(lng, 'translation') as Record<string, Record<string, string>>)?.language?.name ?? lng,
      value: lng,
    }),
  );

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      <ScrollView
        contentContainerStyle={{
          padding: 16,
          paddingBottom: insets.bottom + 80 + activeWorkoutBarPadding,
        }}
        contentInsetAdjustmentBehavior="never"
      >
        <View className="flex-row items-center mb-4">
          <Button
            variant="ghost"
            onPress={() => navigation.goBack()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            className="py-0 px-0 mr-2"
          >
            <Icon name="chevron-back" size={22} color={accentPrimary} />
          </Button>
          <Text className="text-2xl font-bold text-text-primary">
            {t('screens.appSettings.title')}
          </Text>
        </View>

        <View className="bg-surface rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center">
            <Text className="text-base text-text-primary">
              {t('screens.appSettings.themeLabel')}
            </Text>
            <BottomSheetPicker
              value={appTheme}
              options={themeOptions}
              onSelect={setThemePreference}
              title={t('screens.appSettings.themePickerTitle')}
              containerStyle={{ flex: 1, maxWidth: 200 }}
            />
          </View>
        </View>

        <View className="bg-surface rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center">
            <Text className="text-base text-text-primary">
              {t('screens.appSettings.languageLabel')}
            </Text>
            <BottomSheetPicker
              value={selectedLanguage}
              options={languageOptions}
              onSelect={setLanguage}
              title={t('screens.appSettings.languagePickerTitle')}
              containerStyle={{ flex: 1, maxWidth: 200 }}
            />
          </View>
        </View>

        <View className="bg-surface rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center">
            <Text className="text-base text-text-primary">
              {t('screens.appSettings.hapticFeedbackLabel')}
            </Text>
            <Switch
              value={hapticsEnabled}
              onValueChange={setHapticsEnabled}
              trackColor={{ false: formDisabled, true: formEnabled }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Text className="text-text-secondary text-sm mt-2">
            {t('screens.appSettings.hapticFeedbackDescription')}
          </Text>
        </View>

        <View className="bg-surface rounded-xl p-4 mb-4 shadow-sm">
          <View className="flex-row justify-between items-center">
            <Text className="text-base text-text-primary">
              {t('screens.appSettings.cameraShutterLabel')}
            </Text>
            <Switch
              value={soundsEnabled}
              onValueChange={setSoundsEnabled}
              trackColor={{ false: formDisabled, true: formEnabled }}
              thumbColor="#FFFFFF"
            />
          </View>
          <Text className="text-text-secondary text-sm mt-2">
            {t('screens.appSettings.cameraShutterDescription')}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default AppSettingsScreen;
