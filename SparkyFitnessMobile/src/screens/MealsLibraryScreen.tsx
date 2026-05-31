import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useCSSVariable } from 'uniwind';
import Button from '../components/ui/Button';
import Icon from '../components/Icon';
import StatusView from '../components/StatusView';
import MealLibraryRow from '../components/MealLibraryRow';
import { useActiveWorkoutBarPadding } from '../components/ActiveWorkoutBar';
import { useMealSearch, useMeals, useServerConnection } from '../hooks';
import type { RootStackScreenProps } from '../types/navigation';
import type { Meal } from '../types/meals';

type MealsLibraryScreenProps = RootStackScreenProps<'MealsLibrary'>;

const MealsLibraryScreen: React.FC<MealsLibraryScreenProps> = ({ navigation }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const activeWorkoutBarPadding = useActiveWorkoutBarPadding('stack');
  const [accentColor, textMuted] = useCSSVariable([
    '--color-accent-primary',
    '--color-text-muted',
  ]) as [string, string];
  const scrollBottomPadding = insets.bottom + activeWorkoutBarPadding + 16;
  const [searchText, setSearchText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const { isConnected, isLoading: isConnectionLoading } = useServerConnection();
  const {
    meals,
    isLoading: isMealsLoading,
    isError: isMealsError,
    refetch: refetchMeals,
  } = useMeals({ enabled: isConnected });
  const {
    searchResults,
    isSearching,
    isSearchActive,
    isSearchError,
    refetch: refetchSearch,
  } = useMealSearch(searchText, { enabled: isConnected });

  const displayedMeals = isSearchActive ? searchResults : meals;
  const isLoading = isSearchActive
    ? isSearching && searchResults.length === 0
    : isMealsLoading;
  const isError = isSearchActive ? isSearchError : isMealsError;

  const handleMealPress = useCallback((meal: Meal) => {
    navigation.navigate('MealDetail', { mealId: meal.id, initialMeal: meal });
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    if (isSearchActive) {
      await refetchSearch();
    } else {
      await refetchMeals();
    }
    setRefreshing(false);
  }, [isSearchActive, refetchMeals, refetchSearch]);

  const renderHeader = () => (
    <View className="flex-row items-center px-4 pt-4 pb-5">
      <Button
        variant="ghost"
        onPress={() => navigation.goBack()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        className="py-0 px-0 mr-2"
      >
        <Icon name="chevron-back" size={22} color={accentColor} />
      </Button>
      <Text className="text-2xl font-bold text-text-primary">{t('screens.mealsLibrary.title')}</Text>
    </View>
  );

  const renderSearchBar = () => (
    <View className="px-4 pb-3">
      <View
        className="flex-row items-center bg-raised rounded-lg px-3"
        style={{ borderWidth: 1, borderColor: isSearchFocused ? accentColor : 'transparent' }}
      >
        <Icon name="search" size={18} color={textMuted} />
        <View className="flex-1 ml-2">
          <TextInput
            className="text-text-primary"
            style={{ fontSize: 16, paddingVertical: Platform.OS === 'ios' ? 12 : 0 }}
            placeholder={t('screens.mealsLibrary.searchPlaceholder')}
            placeholderTextColor={textMuted}
            value={searchText}
            onChangeText={setSearchText}
            onFocus={() => setIsSearchFocused(true)}
            onBlur={() => setIsSearchFocused(false)}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
        {isSearching ? (
          <ActivityIndicator size="small" color={accentColor} />
        ) : null}
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View className="px-6 py-10 items-center">
      <Text className="text-text-primary text-base font-medium text-center">
        {isSearchActive ? t('screens.mealsLibrary.emptySearchTitle') : t('screens.mealsLibrary.emptyDefaultTitle')}
      </Text>
      <Text className="text-text-secondary text-sm mt-2 text-center">
        {isSearchActive
          ? t('screens.mealsLibrary.emptySearchSubtitle')
          : t('screens.mealsLibrary.emptyDefaultSubtitle')}
      </Text>
    </View>
  );

  const renderContent = () => {
    if (!isConnectionLoading && !isConnected) {
      return (
        <StatusView
          icon="cloud-offline"
          iconColor="#9CA3AF"
          iconSize={64}
          title={t('screens.mealsLibrary.noServerTitle')}
          subtitle={t('screens.mealsLibrary.noServerSubtitle')}
          action={{ label: t('screens.mealsLibrary.goToSettings'), onPress: () => navigation.navigate('Tabs', { screen: 'Settings' }), variant: 'primary' }}
        />
      );
    }

    if (isLoading || isConnectionLoading) {
      return <StatusView loading title={t('screens.mealsLibrary.loadingMeals')} />;
    }

    if (isError) {
      return (
        <StatusView
          icon="alert-circle"
          iconColor="#EF4444"
          iconSize={64}
          title={isSearchActive ? t('screens.mealsLibrary.failedSearchTitle') : t('screens.mealsLibrary.failedLoadTitle')}
          subtitle={t('screens.mealsLibrary.failedSubtitle')}
          action={{ label: t('common.retry'), onPress: () => void (isSearchActive ? refetchSearch() : refetchMeals()), variant: 'primary' }}
        />
      );
    }

    return (
      <FlatList
        data={displayedMeals}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <MealLibraryRow
            meal={item}
            showDivider={index < displayedMeals.length - 1}
            onPress={() => handleMealPress(item)}
          />
        )}
        ListEmptyComponent={renderEmpty}
        keyboardShouldPersistTaps="handled"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={accentColor} />
        }
        contentContainerStyle={{ paddingBottom: scrollBottomPadding, flexGrow: 1 }}
      />
    );
  };

  return (
    <View className="flex-1 bg-background" style={{ paddingTop: insets.top }}>
      {renderHeader()}
      {isConnected ? renderSearchBar() : null}
      {renderContent()}
    </View>
  );
};

export default MealsLibraryScreen;
