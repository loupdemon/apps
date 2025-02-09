import React, { ReactElement, useContext } from 'react';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import { FilterIcon, RefreshIcon } from '../icons';
import {
  Button,
  ButtonIconPosition,
  ButtonSize,
  ButtonVariant,
} from '../buttons/Button';
import AnalyticsContext from '../../contexts/AnalyticsContext';
import { AnalyticsEvent } from '../../lib/analytics';
import { useFeedLayout, useViewSize, ViewSize } from '../../hooks';
import { feature } from '../../lib/featureManagement';
import { useFeature } from '../GrowthBookProvider';
import { setShouldRefreshFeed } from '../../lib/refreshFeed';
import { SharedFeedPage } from '../utilities';
import { getFeedName } from '../../lib/feed';
import { useFeedName } from '../../hooks/feed/useFeedName';

export const filterAlertMessage = 'Edit your personal feed preferences here';

interface MyFeedHeadingProps {
  onOpenFeedFilters: () => void;
}

function MyFeedHeading({
  onOpenFeedFilters,
}: MyFeedHeadingProps): ReactElement {
  const router = useRouter();
  const isMobile = useViewSize(ViewSize.MobileL);
  const { trackEvent } = useContext(AnalyticsContext);
  const { shouldUseListFeedLayout } = useFeedLayout();
  const queryClient = useQueryClient();
  const forceRefresh = useFeature(feature.forceRefresh);
  const isLaptop = useViewSize(ViewSize.Laptop);
  const feedName = getFeedName(router.pathname);
  const { isCustomFeed } = useFeedName({ feedName });

  const onClick = () => {
    trackEvent({ event_name: AnalyticsEvent.ManageTags });
    onOpenFeedFilters();
  };

  const onRefresh = async () => {
    trackEvent({ event_name: AnalyticsEvent.RefreshFeed });
    setShouldRefreshFeed(true);
    await queryClient.refetchQueries({ queryKey: [SharedFeedPage.MyFeed] });
    setShouldRefreshFeed(false);
  };

  const isFetchingFeed =
    useIsFetching({ queryKey: [SharedFeedPage.MyFeed] }) > 0;
  const feedQueryState = queryClient.getQueryState([SharedFeedPage.MyFeed], {
    exact: false,
  });
  const isRefreshing = feedQueryState?.status === 'success' && isFetchingFeed;
  const shouldShowFeedRefresh = forceRefresh && !isCustomFeed;

  let feedFiltersLabel = 'Feed settings';

  if (isCustomFeed) {
    feedFiltersLabel = 'Edit tags';
  }

  return (
    <>
      {shouldShowFeedRefresh && (
        <Button
          size={ButtonSize.Medium}
          variant={isMobile ? ButtonVariant.Tertiary : ButtonVariant.Float}
          className="mr-auto"
          onClick={onRefresh}
          icon={<RefreshIcon />}
          iconPosition={
            shouldUseListFeedLayout ? ButtonIconPosition.Right : undefined
          }
          loading={isRefreshing}
        >
          {isLaptop ? 'Refresh feed' : null}
        </Button>
      )}
      <Button
        size={ButtonSize.Medium}
        variant={isLaptop ? ButtonVariant.Float : ButtonVariant.Tertiary}
        className="mr-auto"
        onClick={onClick}
        icon={<FilterIcon />}
        iconPosition={
          shouldUseListFeedLayout ? ButtonIconPosition.Right : undefined
        }
      >
        {!isMobile ? feedFiltersLabel : null}
      </Button>
    </>
  );
}

export default MyFeedHeading;
