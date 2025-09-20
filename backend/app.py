"""
Backend entry for Medical Supply MVP (Postgres-ready, Daraja stub, courier deep-link generator)
Run:
  pip install -r requirements.txt
  export DATABASE_URL=postgresql://user:pass@host:5432/med_supply (optional)
  export APP_SECRET=change-me
  python app.py initdb   # creates sqlite DB by default for quick local test
  python app.py run
Notes:
- Daraja (M-Pesa) integration is provided as a stub in utils/daraja.py — add credentials.
- Courier deep links are generated in utils/couriers.py (Uber/Bolt style links).
- This backend keeps notification hooks as no-ops.
"""

import os, datetime, uuid
from flask import Flask, request, jsonify, g
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.security import generate_password_hash, check_password_hash
from functools import wraps
import jwt

APP_SECRET = os.environ.get("APP_SECRET", "super-secret-change-me")
DATABASE_URL = os.environ.get("DATABASE_URL", "sqlite:///medical_mvp.db")

app = Flask(__name__)
app.config["SQLALCHEMY_DATABASE_URI"] = DATABASE_URL
app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
app.config["SECRET_KEY"] = APP_SECRET

# Enable CORS for all routes
CORS(app)

db = SQLAlchemy(app)

# Models (kept compact)
class User(db.Model):
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = db.Column(db.String, unique=True, nullable=False)
    password_hash = db.Column(db.String, nullable=False)
    role = db.Column(db.String, nullable=False)  # facility | vendor | admin
    verified = db.Column(db.Boolean, default=False)
    name = db.Column(db.String)
    lat = db.Column(db.Float, nullable=True)
    lon = db.Column(db.Float, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

    def set_password(self, pw):
        self.password_hash = generate_password_hash(pw)
    def check_password(self, pw):
        return check_password_hash(self.password_hash, pw)

class Product(db.Model):
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    vendor_id = db.Column(db.String, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String, nullable=False)
    category = db.Column(db.String, default='general')
    sku = db.Column(db.String)
    price = db.Column(db.Float, nullable=False)
    stock = db.Column(db.Integer, default=0)
    unit = db.Column(db.String, default='pcs')
    min_threshold = db.Column(db.Integer, default=10)
    warehouse_lat = db.Column(db.Float, nullable=True)
    warehouse_lon = db.Column(db.Float, nullable=True)
    last_updated = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class Order(db.Model):
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    facility_id = db.Column(db.String, db.ForeignKey('user.id'), nullable=False)
    vendor_id = db.Column(db.String, db.ForeignKey('user.id'), nullable=False)
    status = db.Column(db.String, default='pending')
    total_amount = db.Column(db.Float, default=0.0)
    emergency = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class OrderItem(db.Model):
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    order_id = db.Column(db.String, db.ForeignKey('order.id'), nullable=False)
    product_id = db.Column(db.String, db.ForeignKey('product.id'), nullable=False)
    qty = db.Column(db.Integer, nullable=False)
    unit_price = db.Column(db.Float, nullable=False)

class Need(db.Model):
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    facility_id = db.Column(db.String, db.ForeignKey('user.id'), nullable=False)
    name = db.Column(db.String, nullable=False)
    qty = db.Column(db.Integer, nullable=False)
    cadence = db.Column(db.String, default='weekly')
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

class Subscription(db.Model):
    id = db.Column(db.String, primary_key=True, default=lambda: str(uuid.uuid4()))
    facility_id = db.Column(db.String, db.ForeignKey('user.id'), nullable=False)
    vendor_id = db.Column(db.String, db.ForeignKey('user.id'), nullable=False)
    auto_order_qty = db.Column(db.Integer, nullable=True)
    cadence = db.Column(db.String, default='monthly')
    active = db.Column(db.Boolean, default=True)

# Simple auth helpers
def create_token(user_id, role):
    payload = {'sub': user_id, 'role': role, 'exp': datetime.datetime.utcnow() + datetime.timedelta(days=7)}
    return jwt.encode(payload, app.config['SECRET_KEY'], algorithm='HS256')

def decode_token(token):
    try:
        return jwt.decode(token, app.config['SECRET_KEY'], algorithms=['HS256'])
    except Exception:
        return None

def auth_required(role=None):
    def wrapper(f):
        @wraps(f)
        def inner(*args, **kwargs):
            auth = request.headers.get('Authorization', None)
            if not auth:
                return jsonify({'error':'missing auth'}), 401
            try:
                token = auth.split(' ')[1]
            except Exception:
                return jsonify({'error':'invalid auth format'}), 401
            payload = decode_token(token)
            if not payload:
                return jsonify({'error':'invalid token'}), 401
            user = User.query.get(payload['sub'])
            if not user:
                return jsonify({'error':'user not found'}), 404
            if role and user.role != role and user.role != 'admin':
                return jsonify({'error':'forbidden'}), 403
            g.current_user = user
            return f(*args, **kwargs)
        return inner
    return wrapper

# Minimal notification noop
def send_notification(to, subject, message):
    print(f"[NOTIF] {to} | {subject} | {message}")

# Routes - auth
@app.route('/api/me', methods=['GET'])
@auth_required()
def get_me():
    user = g.current_user
    return jsonify({
        'id': user.id,
        'email': user.email,
        'name': user.name,
        'role': user.role,
        'verified': user.verified,
        'lat': user.lat,
        'lon': user.lon,
        'created_at': user.created_at.isoformat() if user.created_at else None
    })

@app.route('/api/signup', methods=['POST'])
def signup():
    data = request.json or {}
    email = data.get('email'); pw = data.get('password'); role = data.get('role'); name = data.get('name')
    if not email or not pw or role not in ('facility','vendor'):
        return jsonify({'error':'email,password,role required'}), 400
    if User.query.filter_by(email=email).first():
        return jsonify({'error':'email exists'}), 400
    u = User(email=email, role=role, name=name)
    u.set_password(pw)
    db.session.add(u); db.session.commit()
    return jsonify({'token': create_token(u.id,u.role), 'user_id': u.id})

@app.route('/api/login', methods=['POST'])
def login():
    data = request.json or {}
    email = data.get('email'); pw = data.get('password')
    if not email or not pw:
        return jsonify({'error':'email,password required'}), 400
    u = User.query.filter_by(email=email).first()
    if not u or not u.check_password(pw):
        return jsonify({'error':'invalid credentials'}), 401
    return jsonify({'token': create_token(u.id,u.role), 'user_id': u.id, 'role': u.role, 'verified': u.verified})

@app.route('/api/verify_license', methods=['POST'])
@auth_required('facility')
def verify_license():
    user = g.current_user
    data = request.json or {}
    license_no = data.get('license_number')
    if not license_no:
        return jsonify({'error':'license_number required'}), 400
    # In production: real verification
    user.verified = True; db.session.commit()
    return jsonify({'ok':True})

# Product endpoints
@app.route('/api/vendor/products', methods=['POST'])
@auth_required('vendor')
def add_product():
    u = g.current_user; data = request.json or {}
    p = Product(vendor_id=u.id, name=data.get('name'), category=data.get('category','general'),
                sku=data.get('sku'), price=float(data.get('price',0)), stock=int(data.get('stock',0)),
                unit=data.get('unit','pcs'), min_threshold=int(data.get('min_threshold',10)),
                warehouse_lat=data.get('warehouse_lat'), warehouse_lon=data.get('warehouse_lon'))
    db.session.add(p); db.session.commit()
    return jsonify({'ok':True,'product_id':p.id})

@app.route('/api/products', methods=['GET'])
@auth_required()
def list_products():
    q = request.args.get('q'); vendor_id = request.args.get('vendor_id'); sort_by = request.args.get('sort_by','price')
    base = Product.query
    if q:
        base = base.filter(Product.name.ilike(f"%{q}%"))
    if vendor_id:
        base = base.filter_by(vendor_id=vendor_id)
    if sort_by == 'price':
        base = base.order_by(Product.price)
    elif sort_by == 'vendor':
        base = base.order_by(Product.vendor_id)
    prods = base.limit(500).all()
    out = []
    for p in prods:
        v = User.query.get(p.vendor_id)
        out.append({'id':p.id,'name':p.name,'price':p.price,'stock':p.stock,'vendor':{'id':v.id,'name':v.name,'verified':v.verified}})
    return jsonify(out)

# Orders
@app.route('/api/orders', methods=['POST'])
@auth_required('facility')
def place_order():
    user = g.current_user
    if not user.verified:
        return jsonify({'error':'facility not verified'}), 400
    data = request.json or {}
    items = data.get('items', []); emergency = bool(data.get('emergency', False))
    if not items:
        return jsonify({'error':'items required'}), 400
    first = Product.query.get(items[0]['product_id'])
    if not first:
        return jsonify({'error':'invalid product'}), 400
    vendor_id = first.vendor_id
    order = Order(facility_id=user.id, vendor_id=vendor_id, emergency=emergency)
    db.session.add(order); db.session.flush()
    total = 0.0
    for it in items:
        p = Product.query.get(it['product_id'])
        if not p:
            db.session.rollback(); return jsonify({'error':'product not found'}), 400
        if p.vendor_id != vendor_id:
            db.session.rollback(); return jsonify({'error':'all items must be from same vendor'}), 400
        qty = int(it['qty'])
        if not emergency and p.stock < qty:
            db.session.rollback(); return jsonify({'error':f'not enough stock for {p.name}'}), 400
        if not emergency:
            p.stock -= qty
        oi = OrderItem(order_id=order.id, product_id=p.id, qty=qty, unit_price=p.price)
        db.session.add(oi)
        total += p.price * qty
    order.total_amount = total
    db.session.commit()
    send_notification(User.query.get(vendor_id).email, 'New Order', f'Order {order.id}')
    return jsonify({'ok':True,'order_id':order.id})

@app.route('/api/orders', methods=['GET'])
@auth_required()
def list_orders():
    user = g.current_user
    if user.role == 'facility':
        orders = Order.query.filter_by(facility_id=user.id).order_by(Order.created_at.desc()).all()
    elif user.role == 'vendor':
        orders = Order.query.filter_by(vendor_id=user.id).order_by(Order.created_at.desc()).all()
    else:
        orders = Order.query.order_by(Order.created_at.desc()).all()
    
    out = []
    for o in orders:
        facility = User.query.get(o.facility_id)
        vendor = User.query.get(o.vendor_id)
        out.append({
            'id': o.id,
            'status': o.status,
            'total_amount': o.total_amount,
            'emergency': o.emergency,
            'created_at': o.created_at.isoformat() if o.created_at else None,
            'facility': {'id': facility.id, 'name': facility.name} if facility else None,
            'vendor': {'id': vendor.id, 'name': vendor.name} if vendor else None
        })
    return jsonify(out)

# Emergency courier deep link generator
from utils.couriers import generate_courier_deeplink
@app.route('/api/orders/<order_id>/courier_link', methods=['GET'])
@auth_required()
def courier_link(order_id):
    # expects facility lat/lon query params optional; vendor warehouse lat/lon used as pickup
    o = Order.query.get(order_id)
    if not o:
        return jsonify({'error':'order not found'}), 404
    items = OrderItem.query.filter_by(order_id=o.id).all()
    # gather pickup coords from products' warehouses (first product)
    if not items:
        return jsonify({'error':'no items'}), 400
    p = Product.query.get(items[0].product_id)
    pickup = (p.warehouse_lat or 0.0, p.warehouse_lon or 0.0)
    dropoff_lat = request.args.get('lat'); dropoff_lon = request.args.get('lon')
    dropoff = (float(dropoff_lat), float(dropoff_lon)) if dropoff_lat and dropoff_lon else (0.0,0.0)
    link = generate_courier_deeplink(pickup, dropoff)
    return jsonify({'courier_link': link})

# Payments - Daraja stub
from utils.daraja import initiate_stk_push
@app.route('/api/pay/order/<order_id>', methods=['POST'])
@auth_required('facility')
def pay_order(order_id):
    o = Order.query.get(order_id)
    if not o:
        return jsonify({'error':'order not found'}), 404
    data = request.json or {}
    phone = data.get('phone')
    if not phone:
        return jsonify({'error':'phone required'}), 400
    # call Daraja stub
    resp = initiate_stk_push(phone, int(o.total_amount), f"Payment for order {o.id}")
    return jsonify({'ok':True,'daraja_response': resp})

# Needs & procurement recommendation (naive)
@app.route('/api/needs', methods=['POST'])
@auth_required('facility')
def upload_needs():
    user = g.current_user; data = request.json or {}; items = data.get('needs', [])
    created = []
    for it in items:
        n = Need(facility_id=user.id, name=it.get('name'), qty=int(it.get('qty',0)), cadence=it.get('cadence','weekly'))
        db.session.add(n); created.append(n)
    db.session.commit()
    return jsonify({'created':[c.id for c in created]})

@app.route('/api/procure/recommend', methods=['GET'])
@auth_required('facility')
def recommend():
    user = g.current_user; needs = Need.query.filter_by(facility_id=user.id).all()
    out = []
    for n in needs:
        p = Product.query.filter(Product.name.ilike(f"%{n.name}%"), Product.stock >= n.qty).order_by(Product.price).first()
        if p:
            v = User.query.get(p.vendor_id)
            out.append({'need':n.name, 'vendor':{'id':v.id,'name':v.name}, 'product':{'id':p.id,'price':p.price,'stock':p.stock}})
        else:
            out.append({'need':n.name, 'vendor':None})
    return jsonify(out)

# Analytics - monthly spend simple
@app.route('/api/analytics/spend', methods=['GET'])
@auth_required('facility')
def monthly_spend():
    user = g.current_user
    import datetime
    y = int(request.args.get('year', datetime.datetime.utcnow().year))
    m = int(request.args.get('month', datetime.datetime.utcnow().month))
    start = datetime.datetime(y,m,1)
    if m==12:
        end = datetime.datetime(y+1,1,1)
    else:
        end = datetime.datetime(y,m+1,1)
    orders = Order.query.filter(Order.facility_id==user.id, Order.created_at>=start, Order.created_at<end, Order.status.in_(['confirmed','out_for_delivery','delivered'])).all()
    total = sum(o.total_amount for o in orders)
    return jsonify({'year':y,'month':m,'total_spend':total,'orders_count':len(orders)})

# CLI helpers
def init_db(sample=False):
    db.create_all()
    if sample:
        v = User(email='vendor@example.com', role='vendor', name='BestMed Supplies'); v.set_password('vendorpass'); v.verified=True
        f = User(email='facility@example.com', role='facility', name='County Hospital'); f.set_password('facpass'); f.verified=True
        db.session.add_all([v,f]); db.session.commit()
        p1 = Product(vendor_id=v.id, name='Surgical Gloves - M', price=0.5, stock=1000, min_threshold=100, warehouse_lat=-1.2921, warehouse_lon=36.8219)
        p2 = Product(vendor_id=v.id, name='IV Set - Std', price=5.0, stock=200, min_threshold=20, warehouse_lat=-1.2921, warehouse_lon=36.8219)
        db.session.add_all([p1,p2]); db.session.commit()
        print('sample data created')

if __name__ == '__main__':
    import sys
    if len(sys.argv)>1 and sys.argv[1]=='initdb':
        init_db(sample=True); print('db initialized'); sys.exit(0)
    if len(sys.argv)>1 and sys.argv[1]=='run':
        app.run(debug=True)
    print('\\nUsage:')
    print('  python app.py initdb   # create DB and sample data')
    print('  python app.py run      # start server')