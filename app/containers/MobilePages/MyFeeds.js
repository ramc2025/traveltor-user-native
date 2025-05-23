import Backheading from '../../components/Mobile/Backheading';
import {FeedContext} from '../../context/FeedContext';
import useAuth from '../../hooks/useAuth';
import {isLoggedIn, postAuthReq} from '../../utils/apiHandlers';
import React, {
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  StyleSheet,
  Dimensions,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {useDispatch, useSelector} from 'react-redux';
import {IoCheckmarkSharp} from 'react-native-vector-icons/Ionicons';
import FeedsContainer from '../../components/Mobile/FeedsContainer';
import SadIcon from '../../../public/images/sadIcon.svg';
import FeedLoader from '../../components/Common/FeedLoader';
import {setError} from '../../redux/Slices/errorPopup';
import FeedComment from '../../components/Modal/FeedComment';
import {EventRegister} from 'react-native-event-listeners';
import {initBackgroundTask} from '../../utils/BackgroundTaskService';
import {updateScroll} from '../../redux/Slices/myfeedScroll';

const MyFeeds = () => {
  const [isLoading, setIsLoading] = useState(false);
  const {getMyFeed, FeedReactionAction} = useAuth();
  const isLogin = isLoggedIn();
  const [pageNumber, setPageNumber] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const loader = useRef(null);
  const [contentLoader, setContentLoader] = useState(false);
  const [commentModal, setCommentModal] = useState(false);
  const [postId, setPostId] = useState('');
  const [feedUsername, setFeedUsername] = useState('');
  const [reactionDisabled, setReactionDisabled] = useState(false);
  const [isPageRefresh, setIsPageRefresh] = useState(false);
  const [noData, setNoData] = useState(false);
  const feedContainerRef = useRef(null);
  const {feeds, setFeeds} = useContext(FeedContext);
  const isFirstRender = useRef(true);
  const pullToRefreshRef = useRef(null);
  const [disablePull, setDisablePull] = useState(false);
  const isCalled = useRef(false);
  const [isScrollAtTop, setIsScrollAtTop] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const dispatch = useDispatch();
  const [progress, setProgress] = useState({
    imgUrl: '',
    isPending: false,
    progress: 20,
    status: 'Uploading...',
    publishedAt: Date.now(),
  });

  const {isScroll} = useSelector(state => state?.myfeedScroll);

  useEffect(() => {
    // Initialize background tasks
    // initBackgroundTask();

    // Listen for upload progress updates
    const progressListener = EventRegister.addEventListener(
      'uploadProgress',
      data => {
        setProgress(data);
      },
    );

    // Listen for upload completion
    const completeListener = EventRegister.addEventListener(
      'uploadComplete',
      () => {
        console.log('upload complete');
      },
    );

    return () => {
      // Clean up listeners
      EventRegister.removeEventListener(progressListener);
      EventRegister.removeEventListener(completeListener);
    };
  }, []);

  // Load stored values on component mount
  useEffect(() => {
    const loadStoredValues = async () => {
      try {
        const storedPageNumber = await AsyncStorage.getItem('pageNumber');
        const storedHasMore = await AsyncStorage.getItem('hasMore');

        if (storedPageNumber) setPageNumber(JSON.parse(storedPageNumber));
        if (storedHasMore) setHasMore(storedHasMore === 'true');
      } catch (error) {
        console.error('Error loading stored values:', error);
      }
    };

    loadStoredValues();
  }, []);

  useEffect(() => {
    const storePageInfo = async () => {
      try {
        await AsyncStorage.setItem('pageNumber', JSON.stringify(pageNumber));
        await AsyncStorage.setItem('hasMore', hasMore.toString());
      } catch (error) {
        console.error('Error storing page info:', error);
      }
    };

    storePageInfo();
  }, [pageNumber, hasMore]);

  const fetchTreckScapeFeeds = useCallback(
    async (page = 0, reset = false, refresh = false, loader = true) => {
      try {
        await AsyncStorage.setItem('refresh', 'true');
        !loader && setIsLoading(true);
        setContentLoader(true);

        const response = await getMyFeed(page, refresh);
        if (response?.data) {
          setFeeds(prev =>
            reset ? response?.data?.data : [...prev, ...response?.data?.data],
          );
          setHasMore(response?.data?.data?.length === 5);
          if (!response?.data?.data) {
            setNoData(true);
          }
        }
      } catch (error) {
        console.error(error);
      } finally {
        setContentLoader(false);
        setIsLoading(false);
        setRefreshing(false);
        await AsyncStorage.setItem('refresh', 'true');
      }
    },
    [getMyFeed],
  );

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    const checkRefresh = async () => {
      if (isPageRefresh && !isFirstRender.current) {
        const refresh = await AsyncStorage.getItem('refresh');
        if (!refresh) {
          fetchTreckScapeFeeds(pageNumber, true, true);
        } else if (pageNumber) {
          fetchTreckScapeFeeds(pageNumber, false, false);
        }
      }
    };

    checkRefresh();
  }, [pageNumber]);

  useEffect(() => {
    const checkReload = async () => {
      try {
        const isReload = await AsyncStorage.getItem('reloaded');

        if (!isReload) {
          await AsyncStorage.setItem('reloaded', 'true');
        }
      } catch (error) {
        console.error('Error checking reload status:', error);
      }
    };

    checkReload();

    return () => {
      // Clean up on component unmount
      const cleanUp = async () => {
        try {
          await AsyncStorage.removeItem('reloaded');
          await AsyncStorage.removeItem('pageNumber');
          await AsyncStorage.removeItem('hasMore');
        } catch (error) {
          console.error('Error cleaning up storage:', error);
        }
      };

      cleanUp();
    };
  }, []);

  // Handle infinite scrolling
  const handleScroll = ({nativeEvent}) => {
    const {layoutMeasurement, contentOffset, contentSize} = nativeEvent;
    setIsScrollAtTop(contentOffset.y <= 0);

    const isCloseToBottom =
      layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;

    if (
      isCloseToBottom &&
      hasMore &&
      !contentLoader &&
      !isFirstRender.current
    ) {
      setPageNumber(prev => prev + 1);
      setIsPageRefresh(true);
    }
  };

  const handleLikeDislike = async (id, index, type) => {
    if (isLogin) {
      try {
        setReactionDisabled(true);
        const response = await FeedReactionAction(id, type);
        if (response?.status) {
          const newTrackScapeFeeds = [...feeds];
          if (type === 'Like') {
            if (newTrackScapeFeeds[index].reaction === 'Dislike') {
              newTrackScapeFeeds[index].dislikes -= 1;
            }
            newTrackScapeFeeds[index].likes += 1;
            newTrackScapeFeeds[index].reaction = 'Like';
          } else {
            if (newTrackScapeFeeds[index].reaction === 'Like') {
              newTrackScapeFeeds[index].likes -= 1;
            }
            newTrackScapeFeeds[index].dislikes += 1;
            newTrackScapeFeeds[index].reaction = 'Dislike';
          }

          setFeeds(newTrackScapeFeeds);
          setReactionDisabled(false);
        } else {
          dispatch(
            setError({
              open: true,
              custom_message: response?.error?.message,
            }),
          );
          setReactionDisabled(false);
        }
      } catch (err) {
        dispatch(
          setError({
            open: true,
            custom_message: err || 'Something went wrong',
          }),
        );
        setReactionDisabled(false);
      }
    } else {
      dispatch(
        setError({
          open: true,
          custom_message: 'Please login to cast your vote on the post.',
        }),
      );
    }
  };

  const checkInViews = async feedId => {
    const res = await postAuthReq(`/check-ins/users/${feedId}/watch`);
    if (res?.status) {
      return;
    } else {
      console.log('failed to checkin views');
    }
  };

  // Use React Native's IntersectionObserver alternative
  const handleViewableItemsChanged = useRef(({viewableItems}) => {
    viewableItems.forEach(viewableItem => {
      const feedId = viewableItem.item.id;
      checkInViews(Number(feedId));
    });
  }).current;

  const handleRefresh = async () => {
    setRefreshing(true);
    setIsPageRefresh(false);
    setPageNumber(0);
    await fetchTreckScapeFeeds(0, true, true);
  };

  useEffect(() => {
    // Restore scroll position
    const restoreScrollPosition = async () => {
      try {
        const savedScrollPos = await AsyncStorage.getItem('feedScrollPos');
        if (savedScrollPos && feedContainerRef.current) {
          feedContainerRef.current.scrollTo({
            y: parseInt(savedScrollPos),
            animated: false,
          });
        }
      } catch (error) {
        console.error('Error restoring scroll position:', error);
      }
    };

    restoreScrollPosition();

    if (feeds.length === 0) {
      const checkAndFetchFeeds = async () => {
        try {
          const refresh = await AsyncStorage.getItem('refresh');
          if (!refresh) {
            fetchTreckScapeFeeds(pageNumber, true, true, false);
          } else {
            setPageNumber(0);
            fetchTreckScapeFeeds(0, false, true, false);
          }
        } catch (error) {
          console.error('Error checking refresh status:', error);
        }
      };

      checkAndFetchFeeds();
    }
  }, []);

  // Handle scroll position tracking
  const handleScrollEnd = ({nativeEvent}) => {
    const saveScrollPosition = async () => {
      try {
        const scrollPos = nativeEvent.contentOffset.y;
        await AsyncStorage.setItem('feedScrollPos', scrollPos.toString());
      } catch (error) {
        console.error('Error saving scroll position:', error);
      }
    };

    saveScrollPosition();
  };

  useEffect(() => {
    if (!isCalled.current) {
      isCalled.current = true;
      // Since service workers aren't available in React Native, we'd need to use a different mechanism
      // For example, we could use React Native's AppState or a messaging service
    }

    return () => {
      isCalled.current = false;
    };
  }, []);

  useEffect(() => {
    if (isScroll) {
      if (feedContainerRef.current) {
        feedContainerRef.current.scrollTo({
          y: 0,
          animated: true,
        });
        setTimeout(() => {
          handleRefresh();
        }, 1000);
      }
      dispatch(updateScroll(false));
    }
  }, [isScroll]);

  return (
    <View style={styles.container}>
      <Backheading heading={'My Feeds'} notifyIcon={true} nextTrip={false} />
      <ScrollView
        ref={feedContainerRef}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollViewContent}
        showsVerticalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollEndDrag={handleScrollEnd}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }>
        {progress?.isPending && <PublishStatus publishStatus={progress} />}
        <View style={styles.feedContainer}>
          {isLoading && <FeedLoader />}
          {!isLoading && feeds?.length > 0
            ? feeds?.map((item, index) => (
                <View key={index} style={styles.feedItem}>
                  <FeedsContainer
                    item={item}
                    indexed={index}
                    handleLike={() =>
                      handleLikeDislike(item?.id, index, 'Like')
                    }
                    handleDislike={() =>
                      handleLikeDislike(item?.id, index, 'Dislike')
                    }
                    commentModal={commentModal}
                    setIsLoading={setIsLoading}
                    setCommentModal={setCommentModal}
                    setPostId={setPostId}
                    setFeedUsername={setFeedUsername}
                    reactionDisabled={reactionDisabled}
                  />
                </View>
              ))
            : noData && (
                <View style={styles.noDataContainer}>
                  <View style={styles.noDataImage}>
                    <SadIcon width={30} height={30} />
                  </View>
                  <Text style={styles.noDataText}>
                    Oops! No feeds available at this moment
                  </Text>
                </View>
              )}
          {contentLoader && (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#e93c00" />
            </View>
          )}
          <View style={styles.endLoader} ref={loader} />
        </View>
      </ScrollView>
      <FeedComment
        isVisible={commentModal}
        onClose={() => setCommentModal(false)}
        postId={postId}
        feedUsername={feedUsername}
        setTrackScapeFeeds={setFeeds}
      />
    </View>
  );
};

export default MyFeeds;

const PublishStatus = ({publishStatus}) => {
  const {imgUrl, isPending, progress, status, publishedAt} = publishStatus;
  const showStatus =
    isPending || (publishedAt && Date.now() - publishedAt < 5000);

  if (!showStatus) return null;

  return (
    <View style={styles.publishStatusContainer}>
      <View style={styles.publishStatusHeader}>
        <Image
          source={
            imgUrl && {
              uri: typeof imgUrl === 'string' ? imgUrl : imgUrl.uri,
            }
          }
          style={styles.publishStatusImage}
        />
        <View style={styles.publishStatusTextContainer}>
          {status === 'Published' && <IoCheckmarkSharp size={20} />}
          <Text style={styles.publishStatusText}>{status}</Text>
        </View>
      </View>
      <View style={styles.progressBarBackground}>
        <View style={[styles.progressBarForeground, {width: `${progress}%`}]} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  ptrView: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
    height: Dimensions.get('window').height - 100,
  },
  scrollViewContent: {
    paddingBottom: 50,
  },
  feedContainer: {
    paddingBottom: 20,
    borderColor: '#ccc',
    borderWidth: 1,
  },
  feedItem: {
    marginBottom: 10,
  },
  noDataContainer: {
    flex: 1,
    height: Dimensions.get('window').height - 100,
    alignItems: 'center',
    justifyContent: 'center',
  },
  noDataImage: {
    height: 60,
    marginBottom: 20,
  },
  noDataText: {
    textAlign: 'center',
    color: 'rgba(0, 0, 0, 0.7)',
  },
  loaderContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  endLoader: {
    height: 60,
  },
  publishStatusContainer: {
    flexDirection: 'column',
    backgroundColor: '#fff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 10,
  },
  publishStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  publishStatusImage: {
    width: 48,
    height: 48,
    borderRadius: 4,
    marginRight: 8,
  },
  publishStatusTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  publishStatusText: {
    fontSize: 15,
    color: '#475569',
    marginLeft: 4,
  },
  progressBarBackground: {
    width: '100%',
    height: 4,
    backgroundColor: '#D1D5DB',
    borderRadius: 2,
  },
  progressBarForeground: {
    height: 4,
    backgroundColor: '#3B82F6',
    borderRadius: 2,
  },
});
