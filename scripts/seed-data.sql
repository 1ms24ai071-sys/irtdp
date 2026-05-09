-- Seed users (password = "password123!" hashed with bcrypt rounds=10)
INSERT INTO users (id, email, password_hash, role, display_name, officer_status, last_location_lat, last_location_lng) VALUES
  ('00000000-0000-0000-0000-000000000001','admin@irtdp.com',
   '$2a$10$cBm7eak8VnbRYJxRUNV2TeNtpaNK8jeJCL7IZbjlqgvCtFHSw8Mim','admin','Platform Admin', 'off_duty', NULL, NULL),
  ('00000000-0000-0000-0000-000000000002','officer1@police.local',
   '$2a$10$cBm7eak8VnbRYJxRUNV2TeNtpaNK8jeJCL7IZbjlqgvCtFHSw8Mim','police','Officer Smith', 'available', 12.9716, 77.5946),
  ('00000000-0000-0000-0000-000000000003','analyst@platform.local',
   '$2a$10$cBm7eak8VnbRYJxRUNV2TeNtpaNK8jeJCL7IZbjlqgvCtFHSw8Mim','analyst','Data Analyst', 'off_duty', NULL, NULL),
  ('00000000-0000-0000-0000-000000000004','reporter@platform.local',
   '$2a$10$cBm7eak8VnbRYJxRUNV2TeNtpaNK8jeJCL7IZbjlqgvCtFHSw8Mim','reporter','Public Reporter', 'off_duty', NULL, NULL)
ON CONFLICT DO NOTHING;

-- Seed resources
INSERT INTO resources (name, type, status, latitude, longitude) VALUES
  ('Patrol Car Alpha', 'police_car', 'available', 12.9716, 77.5946),
  ('Patrol Car Beta',  'police_car', 'available', 12.9800, 77.6100),
  ('Ambulance Unit 1', 'ambulance',  'available', 12.9650, 77.5900),
  ('Fire Engine 1',    'fire_truck', 'available', 12.9720, 77.6200)
ON CONFLICT DO NOTHING;

-- Seed 15 sample incidents in Bangalore
INSERT INTO incidents (id,title,description,category,severity,status,latitude,longitude,location,address,reporter_id,risk_score,cluster_id) VALUES
  ('00000000-0000-0000-0001-000000000001','Armed Robbery at ATM','Two masked men robbed customers at SBI ATM on MG Road','Robbery','critical','verified',
   12.9763,77.6033,ST_MakePoint(77.6033,12.9763),'MG Road, Bangalore','00000000-0000-0000-0000-000000000001','high',1),
  ('00000000-0000-0000-0002-000000000001','Vehicle Theft at Mall','Honda City stolen from Forum Mall parking lot','Theft','high','reported',
   12.9279,77.6271,ST_MakePoint(77.6271,12.9279),'Forum Mall, Koramangala','00000000-0000-0000-0000-000000000001','medium',2),
  ('00000000-0000-0000-0003-000000000001','Street Fight on Brigade Rd','Group altercation outside nightclub','Assault','high','verified',
   12.9720,77.6088,ST_MakePoint(77.6088,12.9720),'Brigade Road, Bangalore','00000000-0000-0000-0000-000000000003','medium',1),
  ('00000000-0000-0000-0004-000000000001','Warehouse Fire in Shivajinagar','Commercial fire — 3 units deployed','Fire','critical','resolved',
   12.9850,77.5983,ST_MakePoint(77.5983,12.9850),'Shivajinagar, Bangalore','00000000-0000-0000-0000-000000000001','low',3),
  ('00000000-0000-0000-0005-000000000001','Suspicious Activity at Cubbon Park','Unknown individuals loitering near fountain','Suspicious Activity','medium','reported',
   12.9763,77.5929,ST_MakePoint(77.5929,12.9763),'Cubbon Park, Bangalore','00000000-0000-0000-0000-000000000003','low',1),
  ('00000000-0000-0000-0006-000000000001','Vandalism in HSR Layout','Graffiti on public walls near bus stand','Vandalism','low','resolved',
   12.9116,77.6389,ST_MakePoint(77.6389,12.9116),'HSR Layout, Bangalore','00000000-0000-0000-0000-000000000001','low',2),
  ('00000000-0000-0000-0007-000000000001','Phone Snatching on Old Airport Rd','Bike-borne thief snatched phone at signal','Robbery','high','verified',
   12.9639,77.6486,ST_MakePoint(77.6486,12.9639),'Old Airport Road, Bangalore','00000000-0000-0000-0000-000000000003','medium',2),
  ('00000000-0000-0000-0008-000000000001','Domestic Violence Report — BTM','Neighbors reported screaming; injuries found','Assault','high','pending_review',
   12.9006,77.6306,ST_MakePoint(77.6306,12.9006),'BTM Layout 2nd Stage, Bangalore','00000000-0000-0000-0000-000000000001','high',2),
  ('00000000-0000-0000-0009-000000000001','Hit and Run on Hosur Road','Pedestrian struck; driver fled the scene','Traffic Incident','critical','verified',
   12.8958,77.6271,ST_MakePoint(77.6271,12.8958),'Hosur Road, Electronic City','00000000-0000-0000-0000-000000000003','medium',4),
  ('00000000-0000-0000-0010-000000000001','Pickpocket at Majestic Bus Stand','Wallet stolen in crowded bus stand','Theft','medium','reported',
   12.9775,77.5714,ST_MakePoint(77.5714,12.9775),'Majestic, Bangalore','00000000-0000-0000-0000-000000000001','low',5),
  ('00000000-0000-0000-0011-000000000001','Unattended Bag at Vidhana Soudha','Suspicious bag left near main gate — EOD called','Suspicious Activity','critical','verified',
   12.9793,77.5905,ST_MakePoint(77.5905,12.9793),'Vidhana Soudha, Bangalore','00000000-0000-0000-0000-000000000003','high',1),
  ('00000000-0000-0000-0012-000000000001','ATM Card Skimmer Found','Card skimmer device removed from ATM','Fraud','high','resolved',
   12.9784,77.6408,ST_MakePoint(77.6408,12.9784),'100 Feet Road, Indiranagar','00000000-0000-0000-0000-000000000001','low',2),
  ('00000000-0000-0000-0013-000000000001','Chain Snatching in JP Nagar','Gold chain snatched from elderly woman at market','Robbery','high','reported',
   12.9100,77.5850,ST_MakePoint(77.5850,12.9100),'JP Nagar 6th Phase, Bangalore','00000000-0000-0000-0000-000000000003','medium',4),
  ('00000000-0000-0000-0014-000000000001','Brawl at Gaming Center — Whitefield','Physical altercation; 3 hospitalised','Assault','medium','verified',
   12.9698,77.7499,ST_MakePoint(77.7499,12.9698),'Whitefield, Bangalore','00000000-0000-0000-0000-000000000001','low',3),
  ('00000000-0000-0000-0015-000000000001','Residential Break-in — Jayanagar','Burglary reported; valuables stolen','Theft','critical','pending_review',
   12.9304,77.5800,ST_MakePoint(77.5800,12.9304),'Jayanagar 4th Block, Bangalore','00000000-0000-0000-0000-000000000003','high',4)
ON CONFLICT DO NOTHING;

-- Seed pre-computed hotspots
INSERT INTO hotspots (cluster_id,centroid_lat,centroid_lng,incident_count,severity_score) VALUES
  (1,12.9758,77.5989,4,22),
  (2,12.9374,77.6365,5,18),
  (3,12.9774,77.7241,2, 6),
  (4,12.9120,77.5974,3,14),
  (5,12.9775,77.5714,1, 2)
ON CONFLICT DO NOTHING;
