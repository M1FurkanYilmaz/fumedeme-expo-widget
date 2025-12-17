import { StyleSheet, Pressable, Text, View } from "react-native";
import { getItem, reloadAll, setItem } from "fumedeme-expo-widget";
import { useEffect, useState } from "react";

// App group identifiers for each widget
const STATION_GROUP = "group.expo.modules.examplestation.example";
const WEATHER_GROUP = "group.expo.modules.exampleweather.example";

export default function Index() {
  const getStationData = getItem(STATION_GROUP);
  const getWeatherData = getItem(WEATHER_GROUP);

  const [stationData, setStationData] = useState(
    getStationData("savedData") ?? ""
  );
  const [weatherData, setWeatherData] = useState(
    getWeatherData("savedData") ?? ""
  );

  // Update station widget when data changes
  useEffect(() => {
    const setSharedData = setItem(STATION_GROUP);
    setSharedData("savedData", stationData);
    reloadAll();
  }, [stationData]);

  // Update weather widget when data changes
  useEffect(() => {
    const setSharedData = setItem(WEATHER_GROUP);
    setSharedData("savedData", weatherData);
    reloadAll();
  }, [weatherData]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Widget Example</Text>
      <Text style={styles.subtitle}>Send data to your home screen widgets</Text>

      {/* Station Widget Section */}
      <View style={styles.widgetSection}>
        <Text style={styles.widgetIcon}>🚉</Text>
        <Text style={styles.widgetName}>ExampleStationWidget</Text>
        <Text style={styles.currentValue}>
          {stationData || "No data sent yet"}
        </Text>
        <View style={styles.buttonGroup}>
          <Pressable
            style={styles.button}
            onPress={() => setStationData("Kadıköy Station - 5 mins")}
          >
            <Text style={styles.buttonText}>Send Station Data</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.clearButton]}
            onPress={() => setStationData("")}
          >
            <Text style={styles.buttonText}>Clear</Text>
          </Pressable>
        </View>
      </View>

      {/* Weather Widget Section */}
      <View style={styles.widgetSection}>
        <Text style={styles.widgetIcon}>☀️</Text>
        <Text style={styles.widgetName}>ExampleWeatherWidget</Text>
        <Text style={styles.currentValue}>
          {weatherData || "No data sent yet"}
        </Text>
        <View style={styles.buttonGroup}>
          <Pressable
            style={styles.button}
            onPress={() => setWeatherData("Istanbul - 24°C Sunny")}
          >
            <Text style={styles.buttonText}>Send Weather Data</Text>
          </Pressable>
          <Pressable
            style={[styles.button, styles.clearButton]}
            onPress={() => setWeatherData("")}
          >
            <Text style={styles.buttonText}>Clear</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    gap: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#333",
  },
  subtitle: {
    fontSize: 14,
    color: "#666",
    marginBottom: 10,
  },
  widgetSection: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 20,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  widgetIcon: {
    fontSize: 40,
  },
  widgetName: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  currentValue: {
    fontSize: 14,
    color: "#2196F3",
    fontWeight: "500",
    textAlign: "center",
    minHeight: 20,
  },
  buttonGroup: {
    flexDirection: "row",
    gap: 10,
    marginTop: 8,
  },
  button: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    backgroundColor: "#2196F3",
  },
  clearButton: {
    backgroundColor: "#757575",
  },
  buttonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "white",
  },
});
