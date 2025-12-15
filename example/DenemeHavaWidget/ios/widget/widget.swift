import SwiftUI
import WidgetKit

struct Plug: Codable {
    var plugged: Bool
    var inUse: Bool
    
    var statusColor: Color {
        switch (plugged, inUse) {
        case (false, false): return .green
        case (true, false): return .yellow
        case (true, true): return .red
        case (false, true): return .gray
        }
    }
}

struct Device: Codable {
    var id: String
    var plugs: [Plug]
}

struct DeviceGridView: View {
    @Environment(\.widgetFamily) var family
    let devices: [Device]
    let lastUpdated: Date
    let stationName: String
    
    var formattedLastUpdated: String {
        let formatter = DateFormatter()
        formatter.dateStyle = .none
        formatter.timeStyle = .short
        return "\(formatter.string(from: lastUpdated))"
    }
    
    var body: some View {
        VStack(alignment: .leading, spacing: 6) {
            if stationName.isEmpty {
                Text("Favori istasyon seçilmedi")
                    .font(.caption)
                    .bold()
                    .foregroundColor(.primary)
                    .padding(.horizontal, 8)

                Text("Lütfen uygulama üzerinden favori bir istasyon seçiniz.")
                    .font(.caption2)
                    .foregroundColor(.secondary)
                    .padding(.horizontal, 8)
            } else {
                Text(stationName)
                    .font(.caption)
                    .bold()
                    .foregroundColor(.primary)
                    .padding(.horizontal, 8)

                ZStack(alignment: .bottomLeading) {
                    LazyVGrid(columns: gridColumns, spacing: 8) {
                        ForEach(devices.prefix(deviceLimit).indices, id: \.self) { index in
                            DeviceView(
                                device: devices[index],
                                size: sizeForFamily()
                            )
                        }
                    }
                    .padding(.horizontal, 8)

                    Text(formattedLastUpdated)
                        .font(.caption2)
                        .foregroundColor(.gray)
                        .padding(.horizontal, 8)
                }
            }
        }
    }
    
    var gridColumns: [GridItem] {
        switch family {
        case .systemSmall:
            return [GridItem(.flexible())]
        case .systemMedium:
            return [GridItem(.flexible()), GridItem(.flexible())]
        case .systemLarge:
            return [GridItem(.flexible()), GridItem(.flexible())]
        default:
            return [GridItem(.flexible())]
        }
    }
    
    var deviceLimit: Int {
        switch family {
        case .systemSmall: return 2
        case .systemMedium: return 4
        case .systemLarge: return 8
        default: return 2
        }
    }
    
    private func sizeForFamily() -> CGSize {
        switch family {
        case .systemSmall:
            return CGSize(width: 100, height: 60)
        case .systemMedium:
            return CGSize(width: 110, height: 65)
        case .systemLarge:
            return CGSize(width: 120, height: 70)
        default:
            return CGSize(width: 100, height: 60)
        }
    }
}

struct DeviceView: View {
    let device: Device
    let size: CGSize
    
    var body: some View {
        VStack(alignment: .leading, spacing: 4) {
            Text(device.id)
                .font(.caption)
                .bold()
                .padding(.horizontal, 8)
            
            ZStack {
                RoundedRectangle(cornerRadius: 12)
                    .fill(Color(.systemGray6))
                    .shadow(radius: 2)
                
                VStack(spacing: 8) {
                    ForEach(0..<(device.plugs.count + 1) / 2, id: \.self) { row in
                        HStack(spacing: 8) {
                            ForEach(0..<2) { col in
                                let index = row * 2 + col
                                if index < device.plugs.count {
                                    PlugView(
                                        plug: device.plugs[index],
                                        size: plugSize()
                                    )
                                } else {
                                    Color.clear
                                        .frame(width: plugSize().width, height: plugSize().height)
                                }
                            }
                        }
                    }
                }
            }
        }
        .frame(width: size.width, height: size.height)
    }
    
    private func plugSize() -> CGSize {
        let baseSize = min(size.width, size.height) * 0.40
        return CGSize(width: baseSize, height: baseSize)
    }
}

struct PlugView: View {
    let plug: Plug
    let size: CGSize
    
    var body: some View {
        ZStack {
            RoundedRectangle(cornerRadius: 6)
                .fill(plug.statusColor)
                .shadow(radius: 1)
            
            RoundedRectangle(cornerRadius: 6)
                .stroke(Color.white, lineWidth: 1)
        }
        .frame(width: size.width, height: size.height)
        .animation(.easeInOut, value: plug.statusColor)
    }
}


class DeviceDataManager {
    static let shared = DeviceDataManager()
    private let apiUrl = "http://localhost:3000/devices"
    //private let token = "YOUR_TOKEN_HERE"


    
    func fetchDevices() async throws -> [Device] {
        let text = getItem()
        print("Data received from app: \(text)")
        var request = URLRequest(url: URL(string: apiUrl)!)
        request.httpMethod = "GET"
        //request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        
        let (data, _) = try await URLSession.shared.data(for: request)
        return try JSONDecoder().decode([Device].self, from: data)
    }
    func getItem() -> String {
        let userDefaults = UserDefaults(suiteName: "group.expo.modules.havadeneme.example")
        return userDefaults?.string(forKey: "savedData") ?? ""
    }
}


struct DeviceStatusEntry: TimelineEntry {
    let date: Date
    let devices: [Device]
    let stationName: String
}

@main
struct widget: Widget {
    private let kind = "widget"
    
    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: DeviceStatusProvider()) { entry in
            DeviceGridView(
                devices: entry.devices,
                lastUpdated: entry.date,
                stationName: entry.stationName
            )
        }
        .configurationDisplayName("Cihaz Durumu")
        .description("VoltUp favori istasyonunuzdaki cihaz durumlarını gösterir.")
        .supportedFamilies([.systemSmall, .systemMedium, .systemLarge])
    }
}

struct DeviceStatusProvider: TimelineProvider {
    func placeholder(in context: Context) -> DeviceStatusEntry {
        DeviceStatusEntry(
            date: Date(),
            devices: [],
            stationName: ""
        )
    }
    
    func getSnapshot(in context: Context, completion: @escaping (DeviceStatusEntry) -> Void) {
        Task {
            let stationName = DeviceDataManager.shared.getItem()
            guard !stationName.isEmpty else {
                completion(DeviceStatusEntry(date: Date(), devices: [], stationName: stationName))
                return
            }
            
            do {
                let devices = try await DeviceDataManager.shared.fetchDevices()
                let entry = DeviceStatusEntry(date: Date(), devices: devices, stationName: stationName)
                completion(entry)
            } catch {
                completion(DeviceStatusEntry(date: Date(), devices: [], stationName: stationName))
            }
        }
    }
    
    func getTimeline(in context: Context, completion: @escaping (Timeline<DeviceStatusEntry>) -> Void) {
        Task {
            let stationName = DeviceDataManager.shared.getItem()
            guard !stationName.isEmpty else {
                let entry = DeviceStatusEntry(date: Date(), devices: [], stationName: stationName)
                let timeline = Timeline(entries: [entry], policy: .after(Date().addingTimeInterval(60)))
                completion(timeline)
                return
            }
            
            do {
                let devices = try await DeviceDataManager.shared.fetchDevices()
                let currentDate = Date()
                let nextUpdateDate = Calendar.current.date(byAdding: .minute, value: 1, to: currentDate)!
                
                let entry = DeviceStatusEntry(
                    date: currentDate,
                    devices: devices,
                    stationName: stationName
                )
                
                let timeline = Timeline(
                    entries: [entry],
                    policy: .after(nextUpdateDate)
                )
                
                completion(timeline)
            } catch {
                // In case of error, retry after 1 minute
                let timeline = Timeline(
                    entries: [placeholder(in: context)],
                    policy: .after(Date().addingTimeInterval(60))
                )
                completion(timeline)
            }
        }
    }
}