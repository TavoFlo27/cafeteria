from flask import Flask, render_template, request, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import functools # Necesario para el decorador de login
import json # Necesario para procesar el pedido del carrito

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
# Clave secreta necesaria para 'session' y 'flash'
app.config['SECRET_KEY'] = 'tu_clave_secreta_muy_dificil_de_adivinar' 
db = SQLAlchemy(app)

# --- Modelos de Base de Datos ---
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

# --- Decorador de Autenticación ---
def login_required(view):
    @functools.wraps(view)
    def wrapped_view(**kwargs):
        if 'logged_in' not in session:
            return redirect(url_for('login'))
        return view(**kwargs)
    return wrapped_view

# --- Ruta Principal (Menú del Cliente) ---
@app.route('/')
def index():
    productos = Producto.query.all()
    return render_template('index.html', productos=productos, busqueda=None)

# --- Ruta para Crear Pedidos (del Cliente) ---
@app.route('/crear_pedido', methods=['POST'])
def crear_pedido():
    cliente = request.form.get('cliente_nombre', 'Cliente General') 
    productos_data_str = request.form.get('productos', '[]')
    
    try:
        productos_seleccionados = json.loads(productos_data_str)
    except json.JSONDecodeError:
        productos_seleccionados = []

    metodo_pago = request.form.get('metodo_pago', 'efectivo')
    personalizaciones = request.form.get('personalizaciones', '')
    
    productos_nombres = []
    precios = []
    
    for item in productos_seleccionados:
        producto_id = item.get('id')
        tamano = item.get('tamano')
        producto = Producto.query.get(producto_id)
        if not producto:
            continue

        productos_nombres.append(f"{producto.nombre} ({tamano})")
        
        if tamano == 'grande' and producto.precio_grande:
            precios.append(producto.precio_grande)
        else:
            precios.append(producto.precio)
    
    total = sum(precios)
    
    nuevo_pedido = Pedido(
        cliente=cliente, 
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

# --- (NUEVA RUTA) Para crear pedidos desde el POS del Cajero ---
@app.route('/crear_pedido_cajero', methods=['POST'])
@login_required # Aseguramos que solo el cajero pueda usarla
def crear_pedido_cajero():
    # 1. Capturamos los datos del formulario del POS
    cliente = request.form.get('cliente_nombre_pos', 'Cliente Mostrador')
    productos_data_str = request.form.get('productos_pos', '[]')
    personalizaciones = request.form.get('personalizaciones_pos', '')

    try:
        productos_seleccionados = json.loads(productos_data_str)
    except json.JSONDecodeError:
        productos_seleccionados = []

    productos_nombres = []
    precios = []

    # 2. Calculamos el total
    for item in productos_seleccionados:
        producto_id = item.get('id')
        tamano = item.get('tamano')
        producto = Producto.query.get(producto_id)
        if not producto:
            continue

        productos_nombres.append(f"{producto.nombre} ({tamano})")
        
        if tamano == 'grande' and producto.precio_grande:
            precios.append(producto.precio_grande)
        else:
            precios.append(producto.precio)
    
    total = sum(precios)

    # 3. Creamos el pedido DIRECTAMENTE como PAGADO y EN PREPARACIÓN
    nuevo_pedido = Pedido(
        cliente=cliente,
        productos=", ".join(productos_nombres) + " | " + personalizaciones,
        total=total,
        pago="pagado", # Se asume pagado (efectivo/tarjeta en mostrador)
        estado="en preparación", # Pasa directo al barista
        hora_pago=datetime.now(),
        hora_preparacion=datetime.now() + timedelta(minutes=15)
    )
    
    db.session.add(nuevo_pedido)
    db.session.commit()
    
    # 4. Redirigimos de vuelta a la página del cajero
    return redirect(url_for('cajero'))


# --- Rutas de Autenticación ---
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        
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
            
    # Asume que tienes un 'login.html' o 'login_barista.html'
    # Ajusta este nombre si es diferente
    return render_template('login_barista.html') 

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# --- Ruta del Barista ---
@app.route('/barista')
@login_required
def barista():
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

@app.route('/actualizar_estado/<int:id>', methods=['POST'])
@login_required
def actualizar_estado(id):
    pedido = Pedido.query.get(id)
    pedido.estado = request.form['estado']
    if pedido.estado == "terminado":
        pedido.hora_preparacion = None
    db.session.commit()
    return redirect(url_for('barista'))

# --- Ruta del Cajero (MODIFICADA) ---
@app.route('/cajero')
@login_required
def cajero():
    if session.get('role') != 'cajero':
        flash('Acceso no autorizado', 'error')
        return redirect(url_for('login'))
        
    # El cajero ahora necesita la lista de productos para el POS
    productos = Producto.query.all()
    
    # También sigue necesitando la lista de pedidos pendientes y recientes
    pedidos = Pedido.query.filter(Pedido.estado != "terminado").order_by(Pedido.fecha.desc()).all()
    
    # Pasamos ambas listas a la plantilla
    return render_template('cajero.html', pedidos=pedidos, productos=productos)


# --- Ruta Actualizar Pago (Sigue siendo útil para pedidos online) ---
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

# --- Ruta de Seguimiento de Pedido ---
@app.route('/seguimiento/<int:id_pedido>')
def seguimiento(id_pedido):
    pedido = Pedido.query.get(id_pedido)
    return render_template('seguimiento.html', pedido=pedido, datetime=datetime)

# --- Ruta de Búsqueda ---
@app.route('/buscar')
def buscar():
    query = request.args.get('q', '')
    productos = Producto.query.filter(Producto.nombre.ilike(f'%{query}%')).all()
    return render_template('index.html', productos=productos, busqueda=None)

# --- Bloque de Ejecución Principal ---
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