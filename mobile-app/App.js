import React, { useState, useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';
import QRCode from 'react-native-qrcode-svg';
import Svg, { Rect, Circle, Text as SvgText } from 'react-native-svg';
import { io } from 'socket.io-client';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, SafeAreaView, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';

// Mobile Design Tokens (Task 16)
const tokens = {
  colors: {
    voidBlack: '#050505',
    panelBg: '#141414',
    borderColor: '#333333',
    goldAccent: '#D4AF37',
    goldHover: '#E5C158',
    textMain: '#E0E0E0',
    textMuted: '#888888',
    alert: '#FF4444',
  },
  typography: {
    fontSans: Platform.OS === 'ios' ? 'Helvetica Neue' : 'sans-serif',
    fontMono: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    h1: 28,
    h2: 22,
    body: 16,
    caption: 12,
  }
};

const TicketScreen = ({ phone, onBack }) => {
  const [qrToken, setQrToken] = useState('offline-placeholder-token');
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const fetchToken = async () => {
    try {
      // Use 10.0.2.2 for Android Emulator, localhost for iOS simulator
      const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
      const response = await fetch(`${API_URL}/api/qr/generate?ticketId=TKT-1001&phone=${encodeURIComponent(phone)}`);
      const data = await response.json();
      if (data.qrToken) {
        setQrToken(data.qrToken);
        setLastUpdated(new Date());
      }
    } catch (error) {
      console.log('Network error. Using offline cached token.');
    }
  };

  useEffect(() => {
    fetchToken(); // Initial fetch
    const interval = setInterval(fetchToken, 45000); // Refresh every 45s
    return () => clearInterval(interval);
  }, [phone]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={[styles.header, { flexDirection: 'row', alignItems: 'center' }]}>
        <Text style={[styles.title, { marginLeft: 15 }]}>My Ticket</Text>
      </View>
      <View style={[styles.content, { alignItems: 'center', justifyContent: 'center', flex: 1 }]}>
        <View style={{ backgroundColor: 'white', padding: 20, borderRadius: 12, marginBottom: 20 }}>
          <QRCode
            value={qrToken}
            size={250}
            color="black"
            backgroundColor="white"
          />
        </View>
        <Text style={{ color: tokens.colors.textMain, fontSize: 18, fontWeight: 'bold' }}>Attendee Ticket</Text>
        <Text style={{ color: tokens.colors.goldAccent, fontSize: 16, marginTop: 4 }}>Valid for Gate Entry</Text>
        <Text style={{ color: tokens.colors.textMuted, fontSize: 12, marginTop: 20 }}>
          Auto-refreshes. Last updated: {lastUpdated.toLocaleTimeString()}
        </Text>
      </View>
    </SafeAreaView>
  );
};

const MapScreen = () => {
  const [mapData, setMapData] = useState({ zones: [] });
  const [waitTimes, setWaitTimes] = useState({});

  useEffect(() => {
    const fetchMap = async () => {
      try {
        const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
        const response = await fetch(`${API_URL}/api/map`);
        const data = await response.json();
        setMapData(data);
      } catch (error) {
        console.log('Error fetching map data');
      }
    };

    // We no longer poll wait times, they come via WebSocket!

    fetchMap();
    
    // Setup local WebSocket connection for live crowd data
    const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
    const socket = io(API_URL);
    socket.on('crowd_state_update', (state) => {
      if (state && state.waitTimes) {
        setWaitTimes(state.waitTimes);
      }
    });

    return () => socket.disconnect();
  }, []);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Venue Map</Text>
      </View>
      <ScrollView 
        contentContainerStyle={{ alignItems: 'center', justifyContent: 'center', padding: 20 }}
        maximumZoomScale={3}
        minimumZoomScale={1}
      >
        <Svg height="300" width="300" viewBox="0 0 100 100" style={{ backgroundColor: tokens.colors.panelBg, borderRadius: 12 }}>
          {mapData.zones.map(zone => (
            <React.Fragment key={zone.id}>
              {/* Draw Zone */}
              <Rect
                x={zone.bounds.x}
                y={zone.bounds.y}
                width={zone.bounds.width}
                height={zone.bounds.height}
                fill={tokens.colors.voidBlack}
                stroke={tokens.colors.borderColor}
                strokeWidth="1"
              />
              <SvgText x={zone.bounds.x + 2} y={zone.bounds.y + 8} fill={tokens.colors.goldAccent} fontSize="4" fontFamily={tokens.typography.fontMono}>
                {zone.name}
              </SvgText>

              {/* Draw POIs */}
              {zone.pois.map(poi => (
                <React.Fragment key={poi.id}>
                  <Circle
                    cx={poi.coordX}
                    cy={poi.coordY}
                    r="2"
                    fill={poi.type === 'FOOD' ? tokens.colors.goldHover : poi.type === 'FIRST_AID' ? tokens.colors.alert : tokens.colors.textMuted}
                  />
                  <SvgText x={poi.coordX + 3} y={poi.coordY + 1} fill={tokens.colors.textMain} fontSize="3">
                    {poi.name}
                  </SvgText>
                </React.Fragment>
              ))}

              {/* Draw Gate Wait Time Badge */}
              <Rect 
                x={zone.bounds.x + 60} 
                y={zone.bounds.y + 5} 
                width="15" 
                height="8" 
                fill={tokens.colors.panelBg}
                stroke={tokens.colors.goldAccent}
                strokeWidth="0.5"
                rx="2"
              />
              <SvgText x={zone.bounds.x + 61} y={zone.bounds.y + 10} fill={tokens.colors.goldAccent} fontSize="3" fontWeight="bold">
                Wait: {waitTimes[zone.id === 'zone-a' ? 'gate-1' : 'gate-2'] || 0}m
              </SvgText>
            </React.Fragment>
          ))}
        </Svg>
      </ScrollView>
    </SafeAreaView>
  );
};

const ShopScreen = ({ phone }) => {
  const [vendors, setVendors] = useState([]);
  const [cart, setCart] = useState([]);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
        const response = await fetch(`${API_URL}/api/vendors`);
        const data = await response.json();
        setVendors(data);
      } catch (err) {
        console.error('Error fetching vendors');
      }
    };
    fetchVendors();
  }, []);

  const addToCart = (vendor, item) => {
    setCart(prev => [...prev, { vendorId: vendor.id, item }]);
  };

  const checkout = async () => {
    if (cart.length === 0) return;
    
    // Group by vendor (simplification for MVP: just pick the first vendor's ID)
    const vendorId = cart[0].vendorId; 
    const items = cart.map(c => ({ menuItemId: c.item.id, quantity: 1 }));
    const totalAmount = cart.reduce((sum, c) => sum + c.item.price, 0);

    try {
      const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
      const response = await fetch(`${API_URL}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vendorId, phone, items, totalAmount })
      });
      if (response.ok) {
        alert('Order placed successfully!');
        setCart([]);
      }
    } catch (err) {
      alert('Checkout failed');
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <View style={styles.header}>
        <Text style={styles.title}>Food & Merch</Text>
      </View>
      <ScrollView style={{ padding: 20 }}>
        {vendors.map(v => (
          <View key={v.id} style={{ backgroundColor: tokens.colors.panelBg, padding: 15, borderRadius: 8, marginBottom: 15, borderColor: tokens.colors.borderColor, borderWidth: 1 }}>
            <Text style={{ color: tokens.colors.goldAccent, fontSize: 18, fontWeight: 'bold' }}>{v.name}</Text>
            <Text style={{ color: tokens.colors.textMuted, marginBottom: 10 }}>{v.description}</Text>
            {v.menuItems.map(item => (
              <View key={item.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopColor: tokens.colors.borderColor, borderTopWidth: 1 }}>
                <Text style={{ color: tokens.colors.textMain }}>{item.name} (${item.price.toFixed(2)})</Text>
                <TouchableOpacity 
                  onPress={() => addToCart(v, item)}
                  accessible={true}
                  accessibilityRole="button"
                  accessibilityLabel={`Add ${item.name} to cart`}
                >
                  <Text style={{ color: tokens.colors.goldHover }}>+ Add</Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>
      {cart.length > 0 && (
        <View style={{ padding: 15, backgroundColor: tokens.colors.panelBg, borderTopColor: tokens.colors.borderColor, borderTopWidth: 1 }}>
          <Text style={{ color: tokens.colors.textMain, marginBottom: 10 }}>Cart ({cart.length} items) - Total: ${cart.reduce((s, c) => s + c.item.price, 0).toFixed(2)}</Text>
          <TouchableOpacity 
            style={styles.button} 
            onPress={checkout}
            accessible={true}
            accessibilityRole="button"
            accessibilityLabel="Proceed to checkout"
          >
            <Text style={styles.buttonText}>Checkout</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
};

export default function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState(1); // 1 = Phone, 2 = OTP
  const [activeTab, setActiveTab] = useState('home'); // home, ticket, map, shop
  const [globalAlert, setGlobalAlert] = useState(null);

  useEffect(() => {
    if (isLoggedIn) {
      const API_URL = Platform.OS === 'android' ? 'http://10.0.2.2:4000' : 'http://localhost:4000';
      const socket = io(API_URL);
      
      socket.emit('join_room', 'attendee-room');
      
      socket.on('new_alert', (alert) => {
        setGlobalAlert(alert);
        // Auto-hide after 10s
        setTimeout(() => setGlobalAlert(null), 10000);
      });

      return () => socket.disconnect();
    }
  }, [isLoggedIn]);

  const handleSendOtp = () => {
    if (phone.length > 5) setStep(2);
  };

  const handleVerifyOtp = () => {
    if (otp === '1234') setIsLoggedIn(true);
  };

  if (isLoggedIn) {
    let Content = null;
    if (activeTab === 'ticket') {
      Content = <TicketScreen phone={phone} onBack={() => setActiveTab('home')} />;
    } else if (activeTab === 'map') {
      Content = <MapScreen />;
    } else if (activeTab === 'shop') {
      Content = <ShopScreen phone={phone} />;
    } else {
      Content = (
        <View style={styles.content}>
          <Text style={styles.welcomeText}>Welcome, Attendee!</Text>
          <Text style={styles.subtitleText}>Your event experience starts here.</Text>
          
          <TouchableOpacity style={styles.card} onPress={() => setActiveTab('ticket')}>
            <Text style={styles.cardTitle}>My Ticket</Text>
            <Text style={styles.cardSubtitle}>Tap to view QR Code</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.card, {marginTop: 10}]} onPress={() => setActiveTab('map')}>
            <Text style={styles.cardTitle}>Venue Map</Text>
            <Text style={styles.cardSubtitle}>Navigate the venue</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.card, {marginTop: 10}]} onPress={() => setActiveTab('shop')}>
            <Text style={styles.cardTitle}>Food & Merch</Text>
            <Text style={styles.cardSubtitle}>Pre-order to skip the line</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <SafeAreaView style={styles.container}>
        <StatusBar style="light" />
        
        {/* Global Broadcast Banner */}
        {globalAlert && (
          <View style={{ backgroundColor: globalAlert.priority === 'CRITICAL' ? tokens.colors.alert : tokens.colors.goldAccent, padding: 15 }}>
            <Text style={{ color: tokens.colors.voidBlack, fontWeight: 'bold' }}>{globalAlert.title}</Text>
            <Text style={{ color: tokens.colors.voidBlack }}>{globalAlert.message}</Text>
          </View>
        )}

        {activeTab === 'home' && (
          <View style={styles.header}>
            <Text style={styles.title}>CrowdSync</Text>
          </View>
        )}
        {Content}
        
        {/* Bottom Navigation */}
        <View style={{ flexDirection: 'row', borderTopWidth: 1, borderColor: tokens.colors.borderColor, backgroundColor: tokens.colors.panelBg }}>
          <TouchableOpacity style={{ flex: 1, padding: 15, alignItems: 'center' }} onPress={() => setActiveTab('home')}>
            <Text style={{ color: activeTab === 'home' ? tokens.colors.goldAccent : tokens.colors.textMuted }}>Home</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, padding: 15, alignItems: 'center' }} onPress={() => setActiveTab('map')}>
            <Text style={{ color: activeTab === 'map' ? tokens.colors.goldAccent : tokens.colors.textMuted }}>Map</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, padding: 15, alignItems: 'center' }} onPress={() => setActiveTab('shop')}>
            <Text style={{ color: activeTab === 'shop' ? tokens.colors.goldAccent : tokens.colors.textMuted }}>Shop</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ flex: 1, padding: 15, alignItems: 'center' }} onPress={() => setActiveTab('ticket')}>
            <Text style={{ color: activeTab === 'ticket' ? tokens.colors.goldAccent : tokens.colors.textMuted }}>Ticket</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="light" />
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.authContainer}
      >
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>CrowdSync</Text>
          <Text style={styles.tagline}>Attendee Portal</Text>
        </View>

        {step === 1 ? (
          <View style={styles.formContainer}>
            <Text style={styles.label}>Phone Number</Text>
            <TextInput
              style={styles.input}
              placeholder="+1 234 567 8900"
              placeholderTextColor={tokens.colors.textMuted}
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            <TouchableOpacity style={styles.button} onPress={handleSendOtp}>
              <Text style={styles.buttonText}>Send OTP</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.formContainer}>
            <Text style={styles.label}>Enter OTP (Hint: 1234)</Text>
            <TextInput
              style={styles.input}
              placeholder="----"
              placeholderTextColor={tokens.colors.textMuted}
              keyboardType="number-pad"
              secureTextEntry
              value={otp}
              onChangeText={setOtp}
              maxLength={4}
            />
            <TouchableOpacity style={styles.button} onPress={handleVerifyOtp}>
              <Text style={styles.buttonText}>Verify & Login</Text>
            </TouchableOpacity>
            <TouchableOpacity style={{marginTop: 15}} onPress={() => setStep(1)}>
              <Text style={{color: tokens.colors.goldAccent, textAlign: 'center'}}>Back</Text>
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: tokens.colors.voidBlack,
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoText: {
    fontSize: tokens.typography.h1,
    color: tokens.colors.goldAccent,
    fontWeight: 'bold',
    fontFamily: tokens.typography.fontSans,
  },
  tagline: {
    fontSize: tokens.typography.body,
    color: tokens.colors.textMuted,
    marginTop: 8,
    fontFamily: tokens.typography.fontMono,
  },
  formContainer: {
    backgroundColor: tokens.colors.panelBg,
    padding: 24,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.borderColor,
  },
  label: {
    color: tokens.colors.textMain,
    marginBottom: 8,
    fontSize: tokens.typography.caption,
  },
  input: {
    backgroundColor: tokens.colors.voidBlack,
    borderColor: tokens.colors.borderColor,
    borderWidth: 1,
    borderRadius: 8,
    color: tokens.colors.textMain,
    padding: 16,
    fontSize: tokens.typography.body,
    marginBottom: 24,
  },
  button: {
    backgroundColor: tokens.colors.goldAccent,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: tokens.colors.voidBlack,
    fontSize: tokens.typography.body,
    fontWeight: 'bold',
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: tokens.colors.borderColor,
    backgroundColor: tokens.colors.panelBg,
  },
  title: {
    color: tokens.colors.goldAccent,
    fontSize: tokens.typography.h2,
    fontWeight: 'bold',
  },
  content: {
    padding: 20,
  },
  welcomeText: {
    color: tokens.colors.textMain,
    fontSize: tokens.typography.h2,
    marginBottom: 8,
  },
  subtitleText: {
    color: tokens.colors.textMuted,
    fontSize: tokens.typography.body,
    marginBottom: 24,
  },
  card: {
    backgroundColor: tokens.colors.panelBg,
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: tokens.colors.borderColor,
  },
  cardTitle: {
    color: tokens.colors.goldAccent,
    fontSize: tokens.typography.body,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  cardSubtitle: {
    color: tokens.colors.textMuted,
    fontSize: tokens.typography.caption,
  }
});
