# Courier deep-link generation for external apps (Uber/Bolt-like)
# This creates URL templates that can be opened on mobile to pre-fill pickup/dropoff.
def generate_courier_deeplink(pickup, dropoff):
    # pickup, dropoff are (lat, lon) tuples
    p_lat, p_lon = pickup; d_lat, d_lon = dropoff
    # Uber deep link example (may differ by region); returning multiple options
    uber = f\"uber://?action=setPickup&pickup[latitude]={p_lat}&pickup[longitude]={p_lon}&dropoff[latitude]={d_lat}&dropoff[longitude]={d_lon}\"
    bolt = f\"bolt://rider?pickup={p_lat},{p_lon}&destination={d_lat},{d_lon}\"
    web_uber = f\"https://m.uber.com/ul/?action=setPickup&client_id=YOUR_CLIENT_ID&pickup[latitude]={p_lat}&pickup[longitude]={p_lon}&dropoff[latitude]={d_lat}&dropoff[longitude]={d_lon}\"
    return {'uber_app': uber, 'bolt_app': bolt, 'uber_web': web_uber}