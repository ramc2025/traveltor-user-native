import React, {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  TouchableWithoutFeedback,
  FlatList,
} from 'react-native';
import moment from 'moment';
import {useNavigation, useRoute} from '@react-navigation/native';
import FaRegComment from 'react-native-vector-icons/FontAwesome';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
} from 'react-native-reanimated';
import {Heart} from 'react-native-feather';
import {useSelector} from 'react-redux';
import {getAuthReq} from '../../utils/apiHandlers';
import ReactionIcon from 'react-native-vector-icons/AntDesign';
import CheckIcon from '../../../public/images/icons/check.svg';
import Marker from '../../../public/images/icons/marker.svg';
import FeedReactionList from '../Modal/FeedReactionList';
import FeedMenuBar from '../Modal/FeedMenuBar';
import ShoutOut from '../Modal/ShoutOut';
import Constant from '../../utils/constant';
import FastImage from 'react-native-fast-image';

const windowWidth = Dimensions.get('window').width;

const FeedsContainer = ({
  item,
  handleLike,
  handleDislike,
  setCommentModal,
  setPostId,
  setFeedUsername,
  reactionDisabled,
  setIsDeleteModal,
  setFeedId,
}) => {
  const [expanded, setExpanded] = useState(false);
  const reviewText = item?.review || '';
  const displayText = expanded ? reviewText : reviewText.slice(0, 50);
  const user = useSelector(state => state?.user);
  const navigation = useNavigation();
  const route = useRoute();
  const [open, setOpen] = useState(false);
  const [reactionData, setReactionData] = useState([]);
  const [type, setType] = useState('');
  const [reactionLoader, setReactionLoader] = useState(false);
  const lastTapRef = useRef(0);
  const slug = route.params?.slug;
  const [isShoutOut, setIsShoutOut] = useState(false);
  const [shoutOutFeed, setShoutOutFeed] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const {optimizeImageKitUrl} = Constant();
  const heartScale = useSharedValue(0);

  const isTrekscapeNameShow =
    route.name === 'MyFeeds' ||
    (route.name === 'Profile' && route.params?.id === user?.id) ||
    (route.name === 'TrekscapeFeed' && route.params?.slug === slug);

  const toggleReview = () => {
    setExpanded(prevState => !prevState);
  };

  const fetchReactions = async (checkInId, type) => {
    setReactionLoader(true);
    const res = await getAuthReq(
      `/check-ins/users/${checkInId}/reactions?userId=${user?.id}&rection=${type}`,
    );
    if (res?.status) {
      setReactionData(res?.data?.data);
      setReactionLoader(false);
    } else {
      setReactionLoader(false);
      console.log(res?.error);
    }
  };

  const navigateToProfile = () => {
    navigation.navigate('Profile', {
      id: item?.userId,
      userType: item?.user?.type,
    });
  };

  const navigateToTrailPoint = () => {
    navigation.navigate('TrailpointDetails', {
      slug: item?.trailPoint?.slug,
    });
  };

  const heartAnimatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{scale: heartScale.value}],
      opacity: heartScale.value,
    };
  });

  const animateHeart = () => {
    heartScale.value = withSequence(
      withTiming(1.5, {duration: 200}),
      withDelay(300, withTiming(0, {duration: 200})),
    );
  };

  const handleDoubleTap = event => {
    const currentTime = new Date().getTime();
    const tapGap = currentTime - lastTapRef.current;

    if (tapGap < 300 && tapGap > 0) {
      if (item?.reaction !== 'Like') {
        handleLike(item?.id, 'Like');
      }
      animateHeart();
    }

    lastTapRef.current = currentTime;
  };

  useEffect(() => {
    return () => {
      // Clear FastImage cache when component unmounts
      FastImage.clearMemoryCache();
    };
  }, []);

  const imageData = useMemo(() => item?.media || [], [item?.media]);

  const renderScrollViewSlider = images => {
    const handleScroll = event => {
      const slideWidth = windowWidth;
      const currentIndex = Math.round(
        event.nativeEvent.contentOffset.x / slideWidth,
      );
      setCurrentIndex(currentIndex);
    };

    const renderItem = useCallback(
      ({item: image, index}) => (
        <TouchableWithoutFeedback
          key={index}
          onPress={handleDoubleTap}
          delayPressIn={0}
          delayPressOut={0}>
          <View style={styles.scrollSlide}>
            <FastImage
              source={{
                uri: optimizeImageKitUrl(image, 0, 0),
                priority:
                  index === 0
                    ? FastImage.priority.high
                    : FastImage.priority.normal,
              }}
              style={styles.slideImage}
              resizeMode={FastImage.resizeMode.contain}
              onLoadEnd={() => {
                if (index > 2) {
                  FastImage.clearMemoryCache();
                }
              }}
            />
          </View>
        </TouchableWithoutFeedback>
      ),
      [handleDoubleTap, optimizeImageKitUrl],
    );

    const getImageItemLayout = useCallback(
      (data, index) => ({
        length: windowWidth,
        offset: windowWidth * index,
        index,
      }),
      [],
    );

    const keyExtractor = useCallback((item, index) => `image-${index}`, []);

    return (
      <View style={styles.swiperContainer}>
        <FlatList
          data={images}
          renderItem={renderItem}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          removeClippedSubviews={true}
          initialNumToRender={1}
          maxToRenderPerBatch={2}
          windowSize={3}
          updateCellsBatchingPeriod={100}
          scrollEventThrottle={16}
          decelerationRate="fast"
          bounces={false}
          directionalLockEnabled={true}
          onScroll={handleScroll}
          getItemLayout={getImageItemLayout}
          keyExtractor={keyExtractor}
          viewabilityConfig={{
            itemVisiblePercentThreshold: 50,
            minimumViewTime: 100,
          }}
        />

        {images?.length > 1 && (
          <View style={styles.paginationContainer} pointerEvents="none">
            {images?.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  currentIndex === index
                    ? styles.paginationActiveDot
                    : styles.paginationInactiveDot,
                ]}
              />
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.headerContainer}>
        <View style={styles.userInfoContainer}>
          <TouchableOpacity
            style={styles.avatarContainer}
            onPress={navigateToProfile}>
            <Image
              source={
                item?.user?.profileImage != null
                  ? {uri: `${item?.user?.profileImage}`}
                  : require('../../../public/images/dpPlaceholder.png')
              }
              style={styles.profileImage}
            />
          </TouchableOpacity>
          <View style={styles.userDetailsContainer}>
            <View style={styles.nameRow}>
              <TouchableOpacity onPress={navigateToProfile}>
                <Text style={styles.userName} numberOfLines={1}>
                  {item?.user?.firstname + ' ' + item?.user?.lastname}
                </Text>
              </TouchableOpacity>

              {item?.user?.type?.toLowerCase() === 'trailblazer' && (
                <CheckIcon width={16} height={16} style={{marginRight: 4}} />
              )}

              {item?.trailPoint?.slug && item?.trailPoint?.name && (
                <View style={styles.trailPointWrapper}>
                  <TouchableOpacity onPress={navigateToTrailPoint}>
                    <Text
                      style={styles.trailPointName}
                      numberOfLines={1}
                      ellipsizeMode="tail">
                      {`at ${item?.trailPoint?.name}`}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            <View style={styles.locationRow}>
              <Marker width={15} height={15} />
              <Text style={styles.locationText}>
                {isTrekscapeNameShow
                  ? item?.type === 'TrailPoint'
                    ? item?.trailPoint?.trekscape?.name
                    : item?.trekscape?.name
                  : `Checked in ${moment(Number(item?.timestamp)).fromNow()}`}
              </Text>
            </View>
          </View>
        </View>
        <View style={styles.menuContainer}>
          <FeedMenuBar
            feed={item}
            setIsShoutOut={setIsShoutOut}
            setShoutOutFeed={setShoutOutFeed}
            setIsDeleteModal={setIsDeleteModal}
            setFeedId={setFeedId}
          />
        </View>
      </View>

      {/* Image Carousel Container */}
      <View style={{position: 'relative'}}>
        {imageData.length > 0 && renderScrollViewSlider(imageData)}

        <View style={styles.heartOverlay}>
          <Animated.View style={[heartAnimatedStyle]}>
            <Heart width={56} height={56} fill="white" stroke="white" />
          </Animated.View>
        </View>
      </View>

      {isTrekscapeNameShow ? (
        <>
          <View style={styles.actionsContainer}>
            <View style={styles.likeContainer}>
              <TouchableOpacity
                disabled={
                  (item?.reaction === 'Like' ? true : false) || reactionDisabled
                }
                style={[
                  styles.reactionButton,
                  item?.reaction?.toLowerCase() === 'like' &&
                    styles.activeReaction,
                ]}
                onPress={() => handleLike(item?.id, 'Like')}>
                <ReactionIcon
                  name="like2"
                  size={28}
                  color={
                    item?.reaction?.toLowerCase() === 'like'
                      ? '#e93c00'
                      : '#000'
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setOpen(true);
                  fetchReactions(item?.id, 'Like');
                  setType('Must Go');
                }}>
                <Text style={styles.reactionCount}>{item.likes || 0}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dislikeContainer}>
              <TouchableOpacity
                disabled={
                  (item?.reaction?.toLowerCase() === 'dislike'
                    ? true
                    : false) || reactionDisabled
                }
                style={[
                  styles.reactionButton,
                  item?.reaction?.toLowerCase() === 'dislike' &&
                    styles.activeReaction,
                ]}
                onPress={() => handleDislike(item?.id, 'Dislike')}>
                <ReactionIcon
                  name="dislike2"
                  size={28}
                  color={
                    item?.reaction?.toLowerCase() === 'dislike'
                      ? '#e93c00'
                      : '#000'
                  }
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setOpen(true);
                  fetchReactions(item?.id, 'Dislike');
                  setType('Least Go');
                }}>
                <Text style={styles.reactionCount}>{item.dislikes || 0}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.commentContainer}>
              <TouchableOpacity
                onPress={() => {
                  setPostId(item?.id);
                  setFeedUsername(
                    item?.user?.username || item?.user?.firstname,
                  );
                  setCommentModal(true);
                }}>
                <FaRegComment name="comment-o" size={26} color="#000" />
              </TouchableOpacity>
              <Text style={styles.reactionCount}>
                {item?._count?.comments || 0}
              </Text>
            </View>
          </View>

          {item?.review && (
            <View style={styles.reviewContainer}>
              <Text style={styles.reviewText}>
                <Text style={styles.reviewerName}>
                  {item?.user?.firstname} {item?.user?.lastname}:
                </Text>{' '}
                {displayText}
                {item?.review?.length > 50 && (
                  <Text style={styles.readMoreText} onPress={toggleReview}>
                    {expanded ? '  less' : '  ...more'}
                  </Text>
                )}
              </Text>
            </View>
          )}

          <Text style={styles.timestamp}>
            {moment(Number(item?.timestamp)).fromNow()}
          </Text>

          <View style={styles.divider} />
        </>
      ) : (
        <>
          {item?.review && (
            <View style={styles.reviewContainerAlt}>
              <Text style={styles.reviewTextAlt}>
                <Text style={styles.reviewerNameAlt}>
                  {item?.user?.firstname} {item?.user?.lastname}:
                </Text>{' '}
                {displayText}
                {item?.review?.length > 50 && (
                  <Text style={styles.readMoreTextAlt} onPress={toggleReview}>
                    {expanded ? '  less' : '  ...more'}
                  </Text>
                )}
              </Text>
            </View>
          )}

          <View style={styles.actionGridContainer}>
            <View style={styles.actionGridItem}>
              <TouchableOpacity
                disabled={
                  (item?.reaction === 'Like' ? true : false) || reactionDisabled
                }
                style={[
                  styles.reactionButtonWithLabel,
                  item?.reaction?.toLowerCase() === 'like' &&
                    styles.activeReaction,
                ]}
                onPress={() => handleLike(item?.id, 'Like')}>
                <ReactionIcon
                  name="like2"
                  size={28}
                  color={
                    item?.reaction?.toLowerCase() === 'like'
                      ? '#e93c00'
                      : '#000'
                  }
                />
                <Text style={styles.reactionLabel}>Must Go</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setOpen(true);
                  fetchReactions(item?.id, 'Like');
                  setType('Must Go');
                }}>
                <Text style={styles.reactionCount}>{item.likes || 0}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionGridItem}>
              <TouchableOpacity
                disabled={
                  (item?.reaction?.toLowerCase() === 'dislike'
                    ? true
                    : false) || reactionDisabled
                }
                style={[
                  styles.reactionButtonWithLabel,
                  item?.reaction?.toLowerCase() === 'dislike' &&
                    styles.activeReaction,
                ]}
                onPress={() => handleDislike(item?.id, 'Dislike')}>
                <ReactionIcon
                  name="dislike2"
                  size={28}
                  color={
                    item?.reaction?.toLowerCase() === 'dislike'
                      ? '#e93c00'
                      : '#000'
                  }
                />
                <Text style={styles.reactionLabel}>Least Go</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setOpen(true);
                  fetchReactions(item?.id, 'Dislike');
                  setType('Least Go');
                }}>
                <Text style={styles.reactionCount}>{item.dislikes || 0}</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.actionGridItemComment}>
              <TouchableOpacity
                style={styles.commentButton}
                onPress={() => {
                  setPostId(item?.id);
                  setFeedUsername(
                    item?.user?.username || item?.user?.firstname,
                  );
                  setCommentModal(true);
                }}>
                <FaRegComment name="comment-o" size={26} color="#000" />
              </TouchableOpacity>
              <Text style={styles.reactionCount}>
                {item?._count?.comments || 0}
              </Text>
            </View>
          </View>
        </>
      )}
      {open && (
        <FeedReactionList
          open={open}
          onClose={() => setOpen(false)}
          list={reactionData}
          type={type}
          isLoading={reactionLoader}
          setReactionData={setReactionData}
        />
      )}
      {isShoutOut && (
        <ShoutOut
          open={isShoutOut}
          onClose={() => setIsShoutOut(false)}
          feed={shoutOutFeed}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'white',
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    paddingHorizontal: 20,
    width: '100%',
  },
  userInfoContainer: {
    flexDirection: 'row',
    width: '95%',
    alignItems: 'flex-start',
  },
  avatarContainer: {
    width: '18%',
  },
  userDetailsContainer: {
    width: '81%',
    gap: 6,
  },
  profileImage: {
    width: 50,
    height: 50,
    borderRadius: 50,
    objectFit: 'cover',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
  },
  userName: {
    fontSize: 14,
    fontWeight: '600',
    fontFamily: 'Inter',
    flexShrink: 0,
    marginRight: 4,
  },
  trailPointWrapper: {
    flexShrink: 1,
    flexGrow: 1,
    overflow: 'hidden',
  },
  trailPointName: {
    fontSize: 14,
    color: 'black',
  },
  locationRow: {
    flexDirection: 'row',
    gap: 4,
    alignItems: 'flex-end',
  },
  locationText: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
  menuContainer: {
    width: '5%',
    marginLeft: 10,
    marginTop: 4,
  },
  swiperContainer: {
    width: windowWidth,
    height: (windowWidth * 4) / 3,
    marginTop: 16,
    overflow: 'hidden',
    alignSelf: 'center',
    position: 'relative',
  },
  slideImage: {
    width: windowWidth,
    height: (windowWidth * 4) / 3,
    resizeMode: 'cover',
  },
  // ScrollView alternative styles
  touchableContainer: {
    flex: 1,
  },
  scrollViewWrapper: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollViewContent: {
    alignItems: 'center',
  },
  scrollSlide: {
    width: windowWidth,
    height: (windowWidth * 4) / 3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  noImageContainer: {
    width: windowWidth,
    height: (windowWidth * 4) / 3,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#e0e0e0',
  },
  noImageText: {
    fontSize: 16,
    color: '#666',
  },
  // Custom Pagination Dots Styles
  paginationContainer: {
    position: 'absolute',
    bottom: 20,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 6,
    zIndex: 1,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.3,
    shadowRadius: 2,
    elevation: 3, // For Android shadow
  },
  paginationActiveDot: {
    backgroundColor: '#E93C00',
  },
  paginationInactiveDot: {
    backgroundColor: '#fff',
  },
  heartOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: '60%',
    transform: [{translateX: -60}],
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 100,
    pointerEvents: 'none',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 48,
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 20,
  },
  likeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  dislikeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  commentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  reactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  reactionButtonWithLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  activeReaction: {
    color: '#E93C00',
  },
  reactionCount: {
    fontSize: 16,
    fontFamily: 'Inter',
    fontWeight: 'normal',
  },
  reactionLabel: {
    fontFamily: 'Inter',
    fontSize: 12,
    fontWeight: 'normal',
  },
  reviewContainer: {
    marginTop: 12,
    paddingHorizontal: 20,
  },
  reviewText: {
    fontSize: 13,
    fontFamily: 'Inter',
    lineHeight: 17,
  },
  reviewerName: {
    fontWeight: '600',
  },
  readMoreText: {
    color: '#E86900',
    fontSize: 12,
  },
  timestamp: {
    paddingHorizontal: 20,
    fontSize: 10,
  },
  divider: {
    width: '100%',
    borderBottomWidth: 1,
    borderColor: '#E93C00',
    marginTop: 4,
  },
  reviewContainerAlt: {
    marginTop: 12,
    marginBottom: 12,
    paddingHorizontal: 20,
  },
  reviewTextAlt: {
    fontSize: 12,
    fontFamily: 'Inter',
    lineHeight: 17,
  },
  reviewerNameAlt: {
    fontWeight: '600',
  },
  readMoreTextAlt: {
    color: '#E86900',
    fontSize: 12,
  },
  actionGridContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E93C00',
    paddingVertical: 8,
  },
  actionGridItem: {
    flex: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRightWidth: 1,
    borderColor: '#E93C00',
  },
  actionGridItemComment: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  commentButton: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default memo(FeedsContainer);
