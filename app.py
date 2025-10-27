from flask import Flask, render_template, request, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import functools # Necesario para el decorador de login

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
# Clave secreta necesaria para 'session' y 'flash'
app.config['SECRET_KEY'] = 'tu_clave_secreta_muy_dificil_de_adivinar' 
db = SQLAlchemy(app)

# --- Modelos (Sin cambios) ---
class Producto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), nullable=False)
    precio = db.Column(db.Float, nullable=False)
    precio_grande = db.Column(db.Float)
    categoria = db.Column(db.String(20))

class Pedido(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cliente = db.Column(db.String(50), nullable=False)
    productos = db.Column(db.String(500))
    estado = db.Column(db.String(20), default="pendiente")
    pago = db.Column(db.String(20), default="pendiente")
    total = db.Column(db.Float)
    fecha = db.Column(db.DateTime, default=datetime.now)
    hora_pago = db.Column(db.DateTime)
    hora_preparacion = db.Column(db.DateTime)

# --- Decorador de Login (NUEVO) ---
# Esto protege las rutas para que solo usuarios "logueados" puedan verlas
def login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        return view(**kwargs)
    return wrapped_view

# --- Ruta Index (Sin cambios) ---
@app.route('/')
def index():
    productos = Producto.query.all()
    # CORRECCIÓN: Pasamos 'productos' a la plantilla
    return render_template('index.html', productos=productos, busqueda=None)

# --- Ruta Crear Pedido (CORREGIDA) ---
@app.route('/crear_pedido', methods=['POST'])
def crear_pedido():
    cliente = request.form['cliente']
    # CORRECCIÓN 1: 'productos' es un string "1,2,3". No se usa getlist.
    productos_ids_str = request.form.get('productos', '') 
    
    # CORRECCIÓN 2: Convertimos el string en una lista de IDs
    # Filtramos valores vacíos por si el string está vacío
    productos_ids = [int(id) for id in productos_ids_str.split(',') if id]
    
    metodo_pago = request.form.get('metodo_pago', 'efectivo')
    personalizaciones = request.form.get('personalizaciones', '')
    
    productos_nombres = []
    precios = []
    for id in productos_ids:
        producto = Producto.query.get(id)
        if producto:
            productos_nombres.append(producto.nombre)
            # CORRECCIÓN 3: El script.js *siempre* usa el precio_grande.
            # El backend DEBE calcular el total de la misma forma.
            # Usamos precio_grande si existe, si no, el precio normal.
            if producto.precio_grande:
                precios.append(producto.precio_grande)
            else:
                precios.append(producto.precio)
    
    total = sum(precios)
    
    nuevo_pedido = Pedido(
        cliente=cliente,
        # CORRECCIÓN: Unimos los nombres de productos de la lista
        productos=", ".join(productos_nombres) + " | " + personalizaciones,
        total=total,
        pago="pagado" if metodo_pago == "online" else "pendiente"
    )
    
    if metodo_pago == "online":
        nuevo_pedido.hora_pago = datetime.now()
        nuevo_pedido.hora_preparacion = datetime.now() + timedelta(minutes=15)
        nuevo_pedido.estado = "en preparación"
    
    db.session.add(nuevo_pedido)
    db.session.commit()
    
    if metodo_pago == "online":
        return redirect(url_for('seguimiento', id_pedido=nuevo_pedido.id))
    return redirect(url_for('index'))

# --- Rutas de Login (NUEVO) ---
# Ruta de login genérica
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
        # --- Lógica de autenticación BÁSICA (NO SEGURA) ---
        # En una app real, usa contraseñas hasheadas y una base de datos de usuarios
        if username == 'barista' and password == '1234':
            session['logged_in'] = True
            session['role'] = 'barista'
            return redirect(url_for('barista'))
        elif username == 'cajero' and password == '1234':
            session['logged_in'] = True
            session['role'] = 'cajero'
            return redirect(url_for('cajero'))
        else:
            flash('Usuario o contraseña incorrectos', 'error')
            
    # La plantilla login.html postea a /barista/login, así que la reutilizamos
    # Tu plantilla 'login.html' es para el barista
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# --- Ruta Barista (PROTEGIDA) ---
@app.route('/barista')
@login_required # <-- NUEVO: Protege la ruta
def barista():
    # Opcional: verificar que el rol sea 'barista'
    if session.get('role') != 'barista':
        flash('Acceso no autorizado', 'error')
        return redirect(url_for('login'))
        
    pedidos = Pedido.query.filter(Pedido.pago == "pagado", Pedido.estado != "terminado").order_by(Pedido.hora_pago).all()
    ahora = datetime.now()
    for pedido in pedidos:
        if pedido.hora_preparacion and ahora >= pedido.hora_preparacion and pedido.estado != "listo":
            pedido.estado = "listo"
            db.session.commit()
    return render_template('barista.html', pedidos=pedidos, ahora=ahora)

# --- Ruta Actualizar Estado (PROTEGIDA) ---
@app.route('/actualizar_estado/<int:id>', methods=['POST'])
@login_required
def actualizar_estado(id):
    pedido = Pedido.query.get(id)
    pedido.estado = request.form['estado']
    if pedido.estado == "terminado":
        pedido.hora_preparacion = None
    db.session.commit()
    return redirect(url_for('barista'))

# --- Ruta Cajero (PROTEGIDA) ---
@app.route('/cajero')
@login_required # <-- NUEVO: Protege la ruta
def cajero():
    if session.get('role') != 'cajero':
        flash('Acceso no autorizado', 'error')
        return redirect(url_for('login'))
        
    pedidos = Pedido.query.filter(Pedido.estado != "terminado").order_by(Pedido.fecha.desc()).all()
    return render_template('cajero.html', pedidos=pedidos)

# --- Ruta Actualizar Pago (PROTEGIDA) ---
@app.route('/actualizar_pago/<int:id>', methods=['POST'])
@login_required
def actualizar_pago(id):
    pedido = Pedido.query.get(id)
    pedido.pago = request.form['pago']
    if pedido.pago == "pagado":
        pedido.hora_pago = datetime.now()
        pedido.hora_preparacion = datetime.now() + timedelta(minutes=15)
        pedido.estado = "en preparación"
    db.session.commit()
    return redirect(url_for('cajero'))

# --- Ruta Seguimiento (Sin cambios) ---
@app.route('/seguimiento/<int:id_pedido>')
def seguimiento(id_pedido):
    pedido = Pedido.query.get(id_pedido)
    # CORRECCIÓN: Pasar 'datetime' a la plantilla para poder comparar
    return render_template('seguimiento.html', pedido=pedido, datetime=datetime)

# --- Ruta de Búsqueda (Faltaba) ---
@app.route('/buscar')
def buscar():
    query = request.args.get('q', '')
    # Busca productos cuyo nombre contenga la consulta
    productos = Producto.query.filter(Producto.nombre.ilike(f'%{query}%')).all()
    return render_template('index.html', productos=productos, busqueda=query)

# --- Main (Sin cambios) ---
if __name__ == '__main__':
    with app.app_context():
        db.create_all()
        if not Producto.query.first():
            db.session.add_all([
                Producto(nombre="Macchiato", precio=30.0, precio_grande=45.0, categoria="Bebidas"),
                Producto(nombre="Espresso", precio=20.0, precio_grande=35.0, categoria="Bebidas"),
                Producto(nombre="Mocca", precio=50.0, precio_grande=70.0, categoria="Bebidas"),
                Producto(nombre="Flan de fresa", precio=30.0, precio_grande=45.0, categoria="Repostería"),
                Producto(nombre="Capcucke", precio=25.0, precio_grande=30.0, categoria="Repostería"),
                Producto(nombre="Sandwich", precio=30.0, precio_grande=50.0, categoria="Sándwiches")
            ])
            db.session.commit()
    app.run(debug=True)