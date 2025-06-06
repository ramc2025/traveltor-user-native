import React, {useCallback, useEffect, useState} from 'react';
import {
  Text,
  View,
  Image,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Dimensions,
} from 'react-native';
import useAuth from '../hooks/useAuth';
import {useNavigation} from '@react-navigation/native';
import Constant from '../utils/constant';
import FastImage from 'react-native-fast-image';

const {width: screenWidth} = Dimensions.get('window');

const TrekScapes = () => {
  const [trekScape, setTrekScape] = useState([]);
  const {getTrekscape} = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const {navigate} = useNavigation();
  const {optimizeImageKitUrl} = Constant();

  // Calculate card width to show 1.5 items
  const cardWidth = screenWidth * 0.8; // 80% of screen width for main card
  const cardMargin = 0;
  const snapInterval = cardWidth + cardMargin;

  const fetchTreckScape = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await getTrekscape();
      if (response?.data) {
        setTrekScape(response?.data);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTreckScape();
  }, []);

  const handleNavigate = async id => {
    navigate('TrekscapeDetail', {slug: id});
  };

  return (
    <View style={styles.container}>
      {/* Header Section */}
      <View style={styles.header}>
        <TouchableOpacity
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 5,
          }}
          onPress={() => navigate('Trekscapes')}>
          <Image
            source={require('../../public/images/ring-mobile.png')}
            resizeMode="contain"
          />
          <Text style={styles.exploreText}>Explore the Trekscapes</Text>
        </TouchableOpacity>
      </View>

      {/* Swiper Section */}
      <View style={styles.swiperContainer}>
        <View style={styles.flatListContainer}>
          <FlatList
            data={isLoading ? Array.from({length: 3}) : trekScape}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={snapInterval}
            snapToAlignment="start"
            decelerationRate="fast"
            pagingEnabled={false}
            keyExtractor={(item, index) => item?.slug || index.toString()}
            renderItem={({item, index}) => (
              <View
                style={[
                  styles.flatListItem,
                  {width: cardWidth, marginRight: cardMargin},
                ]}>
                {isLoading ? (
                  <View style={styles.imagePlaceholder} />
                ) : (
                  <>
                    <FastImage
                      source={
                        item.previewMedia[0]
                          ? {
                              uri: optimizeImageKitUrl(
                                item.previewMedia[0],
                                0,
                                0,
                              ),
                            }
                          : require('../../public/images/man.jpg')
                      }
                      style={styles.image}
                      resizeMode="cover"
                    />
                    <View style={styles.card}>
                      <Text style={styles.name}>{item.name}</Text>
                      <View style={styles.infoRow}>
                        <View style={styles.infoCol}>
                          <View style={styles.label}>
                            <Image
                              source={require('../../public/images/trekscapes/spot-black.png')}
                              style={{width: 12, height: 12}}
                            />
                            <Text style={{fontSize: 12}}>
                              {item.trailPoints} Trail Points
                            </Text>
                          </View>
                          <View style={styles.label}>
                            <Image
                              source={require('../../public/images/trekscapes/treksters-black.png')}
                              style={{width: 12, height: 12}}
                            />
                            <Text style={{fontSize: 12}}>
                              {item.treksters} Treksters
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          onPress={() => handleNavigate(item.slug)}
                          style={styles.exploreBtn}>
                          <Text style={styles.exploreBtnText}>Explore</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </>
                )}
              </View>
            )}
            contentContainerStyle={{paddingLeft: 16, paddingRight: 16}}
            getItemLayout={(data, index) => ({
              length: snapInterval,
              offset: snapInterval * index,
              index,
            })}
          />
        </View>
      </View>
    </View>
  );
};

export default TrekScapes;

const styles = StyleSheet.create({
  container: {
    paddingTop: 80,
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 30,
    alignItems: 'center',
  },
  searchInput: {
    width: '100%',
    height: 40,
    borderWidth: 1,
    borderColor: '#ccc',
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
  },
  exploreText: {
    color: '#E93C00',
    fontSize: 14,
    fontWeight: '500',
  },
  flatListContainer: {
    height: 280,
  },
  flatListItem: {
    alignItems: 'center',
    position: 'relative',
  },
  swiperContainer: {
    height: 280,
  },
  slide: {
    alignItems: 'center',
    position: 'relative',
  },
  image: {
    height: 230,
    width: '90%',
    borderRadius: 20,
  },
  imagePlaceholder: {
    height: 230,
    width: '90%',
    backgroundColor: '#ccc',
    borderRadius: 20,
  },
  card: {
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
    position: 'absolute',
    bottom: 5,
    left: 30,
    right: 30,
  },
  name: {
    fontSize: 13,
    fontWeight: '500',
    color: '#121212',
  },
  infoRow: {
    flexDirection: 'row',
    marginTop: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoCol: {
    flexDirection: 'column',
  },
  label: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    fontSize: 11,
    color: '#333',
  },
  exploreBtn: {
    backgroundColor: '#FCE6DE',
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#E93C00',
  },
  exploreBtnText: {
    color: '#E93C00',
    fontSize: 10,
    fontWeight: '500',
  },
});
