-- =============================================================
-- AF Tracker Setup Script
-- Run this entire file in your Supabase SQL Editor:
--   https://supabase.com/dashboard/project/htorrrknltwnfmnihtgf/sql
-- =============================================================

-- 1. Allow public (unauthenticated) users to read locations
DROP POLICY IF EXISTS "Locations are viewable by authenticated users" ON public.locations;
DROP POLICY IF EXISTS "Locations are viewable by everyone" ON public.locations;

CREATE POLICY "Locations are viewable by everyone"
  ON public.locations FOR SELECT
  TO anon, authenticated
  USING (true);

-- 2. Seed all Anytime Fitness Singapore locations
-- Safe to re-run: deletes existing SG rows first
DELETE FROM public.locations WHERE country = 'SG';

INSERT INTO public.locations (name, address, lat, lng, country, region, is_24h) VALUES

-- CENTRAL SINGAPORE
('Ang Mo Kio Hub',
 '53 Ang Mo Kio Ave 3 #03-38, Singapore 569933',
 1.3694, 103.8454, 'SG', 'Central', true),

('Balestier - 288',
 '288 Balestier Road #02-01, Singapore 329730',
 1.3245, 103.8497, 'SG', 'Central', true),

('Bishan - Junction 8',
 '9 Bishan Place #B1-01, Singapore 579837',
 1.3508, 103.8487, 'SG', 'Central', true),

('Braddell - Thomson Plaza',
 '301 Upper Thomson Road #03-26, Singapore 574408',
 1.3588, 103.8352, 'SG', 'Central', true),

('Bukit Timah - Beauty World Centre',
 '144 Upper Bukit Timah Road #B2-01, Singapore 588177',
 1.3421, 103.7762, 'SG', 'Central', true),

('Bugis+',
 '201 Victoria Street #05-01, Singapore 188067',
 1.2999, 103.8552, 'SG', 'Central', true),

('City Hall - Peninsula Plaza',
 '111 North Bridge Road #B1-02, Singapore 179098',
 1.2929, 103.8508, 'SG', 'Central', true),

('MacPherson - Poiz Centre',
 '51 Upper Serangoon Road #04-01, Singapore 347697',
 1.3265, 103.8818, 'SG', 'Central', true),

('Novena - United Square',
 '101 Thomson Road #B1-18, Singapore 307591',
 1.3201, 103.8434, 'SG', 'Central', true),

('Novena - Velocity',
 '238 Thomson Road #04-01, Singapore 307683',
 1.3205, 103.8447, 'SG', 'Central', true),

('Orchard - Lucky Plaza',
 '304 Orchard Road #05-13, Singapore 238863',
 1.3033, 103.8334, 'SG', 'Central', true),

('Plaza Singapura - Dhoby Ghaut',
 '68 Orchard Road #05-01, Singapore 238839',
 1.3009, 103.8456, 'SG', 'Central', true),

('Paya Lebar Square',
 '60 Paya Lebar Road #04-35, Singapore 409051',
 1.3182, 103.8921, 'SG', 'Central', true),

('Suntec City',
 '3 Temasek Boulevard #03-328, Singapore 038983',
 1.2942, 103.8580, 'SG', 'Central', true),

('Tiong Bahru Plaza',
 '302 Tiong Bahru Road #04-94, Singapore 168732',
 1.2855, 103.8268, 'SG', 'Central', true),

('Toa Payoh - HDB Hub',
 '480 Lorong 6 Toa Payoh #01-08, Singapore 310480',
 1.3343, 103.8524, 'SG', 'Central', true),

('VIIO @ Balestier',
 '2 Balestier Road #01-27, Singapore 320002',
 1.3254, 103.8516, 'SG', 'Central', true),

('Great World City',
 '1 Kim Seng Promenade #B1-143, Singapore 237994',
 1.2921, 103.8328, 'SG', 'Central', true),

('Harbourfront - VivoCity',
 '1 HarbourFront Walk #03-09, Singapore 098585',
 1.2644, 103.8222, 'SG', 'Central', true),

('Serangoon - NEX',
 '23 Serangoon Central #04-28, Singapore 556083',
 1.3501, 103.8730, 'SG', 'Central', true),

-- NORTH EAST
('Compass One - Sengkang',
 '1 Sengkang Square #04-01, Singapore 545078',
 1.3917, 103.8953, 'SG', 'North East', true),

('Hougang Mall',
 '90 Hougang Avenue 10 #04-01, Singapore 538766',
 1.3722, 103.8927, 'SG', 'North East', true),

('Kovan',
 '206 Hougang Street 21 #01-56, Singapore 530206',
 1.3620, 103.8868, 'SG', 'North East', true),

('Punggol - Waterway Point',
 '83 Punggol Central #03-01, Singapore 828761',
 1.4058, 103.9024, 'SG', 'North East', true),

('Punggol - Oasis Terraces',
 '681 Punggol Drive #04-01, Singapore 820681',
 1.4025, 103.9068, 'SG', 'North East', true),

('Tampines - Century Square',
 '2 Tampines Central 5 #03-28, Singapore 529509',
 1.3527, 103.9450, 'SG', 'North East', true),

('Tampines Mall',
 '4 Tampines Central 5 #04-04, Singapore 529510',
 1.3528, 103.9454, 'SG', 'North East', true),

('Tampines - Our Tampines Hub',
 '1 Tampines Walk #04-33, Singapore 528523',
 1.3529, 103.9406, 'SG', 'North East', true),

('Hougang - Kang Kar Mall',
 '1 Hougang Avenue 3 #04-01, Singapore 538813',
 1.3638, 103.8893, 'SG', 'North East', true),

('Pasir Ris - White Sands',
 '1 Pasir Ris Central Street 3 #04-01, Singapore 518457',
 1.3726, 103.9493, 'SG', 'North East', true),

-- NORTH WEST
('Bukit Batok - West Mall',
 '1 Bukit Batok Central Link #03-01, Singapore 658713',
 1.3483, 103.7496, 'SG', 'North West', true),

('Bukit Panjang Plaza',
 '1 Jelebu Road #B1-01, Singapore 677743',
 1.3795, 103.7657, 'SG', 'North West', true),

('Canberra Plaza',
 '133 Canberra View #02-20, Singapore 750133',
 1.4434, 103.8202, 'SG', 'North West', true),

('Causeway Point - Woodlands',
 '1 Woodlands Square #04-01, Singapore 738099',
 1.4361, 103.7861, 'SG', 'North West', true),

('Choa Chu Kang - Lot One',
 '21 Choa Chu Kang Avenue 4 #04-12, Singapore 689812',
 1.3852, 103.7449, 'SG', 'North West', true),

('Northpoint City - Yishun',
 '930 Yishun Avenue 2 #04-28, Singapore 769098',
 1.4285, 103.8354, 'SG', 'North West', true),

('Sun Plaza - Sembawang',
 '30 Sembawang Drive #04-01, Singapore 757713',
 1.4496, 103.8200, 'SG', 'North West', true),

('Teck Whye - Choa Chu Kang',
 '9 Teck Whye Lane #01-01, Singapore 688195',
 1.3736, 103.7567, 'SG', 'North West', true),

('Woodlands - Civic Centre',
 '900 South Woodlands Drive #02-01, Singapore 730900',
 1.4362, 103.7862, 'SG', 'North West', true),

('Yishun - Junction Nine',
 '18 Yishun Avenue 9 #02-56, Singapore 768897',
 1.4243, 103.8413, 'SG', 'North West', true),

('Bukit Timah - The Rail Mall',
 '396 Upper Bukit Timah Road #01-01, Singapore 678048',
 1.3578, 103.7698, 'SG', 'North West', true),

-- SOUTH EAST
('Bedok Mall',
 '311 New Upper Changi Road #04-08, Singapore 467360',
 1.3241, 103.9299, 'SG', 'South East', true),

('Changi City Point',
 '5 Changi Business Park Central 1 #B1-27, Singapore 486017',
 1.3341, 103.9636, 'SG', 'South East', true),

('EastPoint Mall - Simei',
 '3 Simei Street 6 #03-38, Singapore 528833',
 1.3413, 103.9494, 'SG', 'South East', true),

('Heartbeat @ Bedok',
 '11 Bedok North Street 1 #04-01, Singapore 469662',
 1.3250, 103.9303, 'SG', 'South East', true),

('Loyang - Pasir Ris',
 '258 Pasir Ris Street 21 #02-01, Singapore 510258',
 1.3700, 103.9750, 'SG', 'South East', true),

-- SOUTH WEST
('Clementi Mall',
 '3155 Commonwealth Avenue West #04-30, Singapore 129588',
 1.3148, 103.7651, 'SG', 'South West', true),

('IMM - Jurong East',
 '2 Jurong East Street 21 #02-01, Singapore 609601',
 1.3337, 103.7474, 'SG', 'South West', true),

('JEM - Jurong East',
 '50 Jurong Gateway Road #04-01, Singapore 608549',
 1.3333, 103.7436, 'SG', 'South West', true),

('Jurong Point',
 '1 Jurong West Central 2 #02-K4, Singapore 648886',
 1.3399, 103.7074, 'SG', 'South West', true),

('Rochester Mall - Dover',
 '35 Rochester Drive #02-01, Singapore 138639',
 1.3084, 103.7877, 'SG', 'South West', true),

('Star Vista - Buona Vista',
 '1 Vista Exchange Green #01-01, Singapore 138617',
 1.3074, 103.7882, 'SG', 'South West', true),

('Westgate - Jurong East',
 '3 Gateway Drive #04-01, Singapore 608532',
 1.3340, 103.7432, 'SG', 'South West', true),

('Queensway - Alexandra',
 '1 Alexandra Road #01-01, Singapore 159964',
 1.2883, 103.8022, 'SG', 'South West', true),

('Jurong West - Boon Lay',
 '221 Boon Lay Place #01-130, Singapore 640221',
 1.3458, 103.7018, 'SG', 'South West', true);

-- Verify
SELECT region, COUNT(*) as count FROM public.locations WHERE country = 'SG' GROUP BY region ORDER BY region;
SELECT COUNT(*) as total FROM public.locations WHERE country = 'SG';
