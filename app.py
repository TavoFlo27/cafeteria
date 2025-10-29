from flask import Flask, render_template, request, redirect, url_for, session, flash
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import functools
import json

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
app.config['SECRET_KEY'] = 'tu_clave_secreta_muy_dificil_de_adivinar'
db = SQLAlchemy(app)

# --- Modelos de Base de Datos ---
class Producto(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    nombre = db.Column(db.String(50), nullable=False)
    precio = db.Column(db.Float, nullable=False)
    precio_grande = db.Column(db.Float)
    categoria = db.Column(db.String(20))
    imagen = db.Column(db.String(200), default='https://placehold.co/300x200/6F4E37/FFFFFF/png?text=Delicia')

class Pedido(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    cliente = db.Column(db.String(50), nullable=False)
    productos = db.Column(db.String(500)) # Guardará algo como "Producto (tamaño) xCantidad"
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

# --- Rutas Públicas ---
@app.route('/')
def index():
    productos = Producto.query.all()
    categorias_unicas = db.session.query(Producto.categoria).distinct().all()
    categorias = [c[0] for c in categorias_unicas if c[0]]
    return render_template('index.html', productos=productos, categorias=categorias, busqueda=None)

@app.route('/nosotros')
def nosotros():
    return render_template('nosotros.html')

# --- Ruta Crear Pedido (Cliente) ---
@app.route('/crear_pedido', methods=['POST'])
def crear_pedido():
    cliente = request.form.get('cliente_nombre', 'Cliente General')
    # Esperamos JSON como: [{"id": 1, "tamano": "grande", "cantidad": 2}, ...]
    productos_data_str = request.form.get('productos', '[]')

    try:
        productos_seleccionados = json.loads(productos_data_str)
    except json.JSONDecodeError:
        productos_seleccionados = []

    metodo_pago = request.form.get('metodo_pago', 'efectivo')
    personalizaciones = request.form.get('personalizaciones', '') # Esto sigue igual por ahora

    productos_descripciones = [] # Para guardar "Nombre (tamaño) xCantidad"
    total = 0.0

    # Calculamos total considerando cantidad
    for item in productos_seleccionados:
        producto_id = item.get('id')
        tamano = item.get('tamano')
        cantidad = item.get('cantidad', 1) # Obtenemos cantidad, default 1
        producto = Producto.query.get(producto_id)
        if not producto or cantidad <= 0: # Ignorar si no existe o cantidad inválida
            continue

        precio_unitario = 0
        if tamano == 'grande' and producto.precio_grande:
            precio_unitario = producto.precio_grande
        else:
            precio_unitario = producto.precio

        # Sumamos al total (precio * cantidad)
        total += precio_unitario * cantidad

        # Creamos la descripción incluyendo cantidad
        productos_descripciones.append(f"{producto.nombre} ({tamano}) x{cantidad}")

    # Creamos el pedido
    nuevo_pedido = Pedido(
        cliente=cliente,
        productos=", ".join(productos_descripciones) + " | " + personalizaciones,
        total=total,
        pago="pagado" if metodo_pago == "online" else "pendiente"
    )

    if metodo_pago == "online":
        nuevo_pedido.hora_pago = datetime.now()
        nuevo_pedido.hora_preparacion = datetime.now() + timedelta(minutes=15)
        nuevo_pedido.estado = "en preparación"
    # Nota: Si es 'efectivo', pago y estado se quedan como 'pendiente'

    db.session.add(nuevo_pedido)
    db.session.commit()

    # Redirigimos a seguimiento SIEMPRE después de crear el pedido
    return redirect(url_for('seguimiento', id_pedido=nuevo_pedido.id))

# --- Ruta Crear Pedido (Cajero POS) ---
@app.route('/crear_pedido_cajero', methods=['POST'])
@login_required
def crear_pedido_cajero():
    cliente = request.form.get('cliente_nombre_pos', 'Cliente Mostrador')
    productos_data_str = request.form.get('productos_pos', '[]')
    personalizaciones = request.form.get('personalizaciones_pos', '')

    try:
        productos_seleccionados = json.loads(productos_data_str)
    except json.JSONDecodeError:
        productos_seleccionados = []

    productos_descripciones = []
    total = 0.0

    # Calculamos total considerando cantidad
    for item in productos_seleccionados:
        producto_id = item.get('id')
        tamano = item.get('tamano')
        cantidad = item.get('cantidad', 1)
        producto = Producto.query.get(producto_id)
        if not producto or cantidad <= 0:
            continue

        precio_unitario = 0
        if tamano == 'grande' and producto.precio_grande:
            precio_unitario = producto.precio_grande
        else:
            precio_unitario = producto.precio

        total += precio_unitario * cantidad
        productos_descripciones.append(f"{producto.nombre} ({tamano}) x{cantidad}")

    # Creamos el pedido directamente como PAGADO y EN PREPARACIÓN
    nuevo_pedido = Pedido(
        cliente=cliente,
        productos=", ".join(productos_descripciones) + " | " + personalizaciones,
        total=total,
        pago="pagado",
        estado="en preparación",
        hora_pago=datetime.now(),
        hora_preparacion=datetime.now() + timedelta(minutes=15)
    )

    db.session.add(nuevo_pedido)
    db.session.commit()

    return redirect(url_for('cajero'))

# --- Rutas de Autenticación ---
@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        username = request.form['username']
        password = request.form['password']
        if username == 'barista' and password == '1234':
            session['logged_in'] = True; session['role'] = 'barista'
            return redirect(url_for('barista'))
        elif username == 'cajero' and password == '1234':
            session['logged_in'] = True; session['role'] = 'cajero'
            return redirect(url_for('cajero'))
        else: flash('Usuario o contraseña incorrectos', 'error')
    return render_template('login_barista.html') # Ajusta si tu archivo se llama login.html

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# --- Rutas de Admin ---
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

@app.route('/cajero')
@login_required
def cajero():
    if session.get('role') != 'cajero':
        flash('Acceso no autorizado', 'error')
        return redirect(url_for('login'))
    productos = Producto.query.all()
    pedidos = Pedido.query.filter(Pedido.estado != "terminado").order_by(Pedido.fecha.desc()).all()
    return render_template('cajero.html', pedidos=pedidos, productos=productos)

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

# --- Ruta de Seguimiento ---
@app.route('/seguimiento/<int:id_pedido>')
def seguimiento(id_pedido):
    pedido = Pedido.query.get(id_pedido)
    return render_template('seguimiento.html', pedido=pedido, datetime=datetime)

# --- Ruta de Búsqueda ---
@app.route('/buscar')
def buscar():
    query = request.args.get('q', '')
    productos = Producto.query.filter(Producto.nombre.ilike(f'%{query}%')).all()
    categorias_unicas = db.session.query(Producto.categoria).distinct().all()
    categorias = [c[0] for c in categorias_unicas if c[0]]
    return render_template('index.html', productos=productos, categorias=categorias, busqueda=query)

# --- Bloque Principal ---
if __name__ == '__main__':
    with app.app_context():
        # ¡Importante! Borra database.db si hiciste cambios al modelo Producto (ej: añadir 'imagen')
        db.create_all()
        if not Producto.query.first():
            db.session.add_all([
                Producto(nombre="Macchiato", precio=30.0, precio_grande=45.0, categoria="Bebidas", imagen="https://images.unsplash.com/photo-1542888699-312A6E58034a?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNjUyOXwwfDF8c2VhcmNofDEwfHxjYXJhbWVsJTIwbWFjY2hpYXRvfGVufDB8fHx8MTcyOTk5NTQ1OXww&ixlib=rb-4.0.3&q=80&w=400"),
                Producto(nombre="Espresso", precio=20.0, precio_grande=35.0, categoria="Bebidas", imagen="https://images.unsplash.com/photo-1512568428054-d74c833b3e6e?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNjUyOXwwfDF8c2VhcmNofDR8fGVzcHJlc3NvJTIwY3VwfGVufDB8fHx8MTcyOTk5NTQ5OHww&ixlib=rb-4.0.3&q=80&w=400"),
                Producto(nombre="Mocca", precio=50.0, precio_grande=70.0, categoria="Bebidas", imagen="https://images.unsplash.com/photo-1541167760496-1628856ab772?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNjUyOXwwfDF8c2VhcmNofDJ8fG1vY2hhJTIwY29mZmVlfGVufDB8fHx8MTcyOTk5NTUyN3ww&ixlib=rb-4.0.3&q=80&w=400"),
                Producto(nombre="Latte", precio=40.0, precio_grande=55.0, categoria="Bebidas", imagen="https://images.unsplash.com/photo-1587085799378-6d8063a5c13c?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNjUyOXwwfDF8c2VhcmNofDE0fHxsYXR0ZSUyMGFydHxlbnwwfHx8fDE3Mjk5OTU1NTZ8MA&ixlib=rb-4.0.3&q=80&w=400"),
                Producto(nombre="Cheesecake", precio=30.0, precio_grande=45.0, categoria="Repostería", imagen="https://images.unsplash.com/photo-1567327606363-d39b8c04c004?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNjUyOXwwfDF8c2VhcmNofDE4fHxzdHJhd2JlcnJ5JTIwY2hlZXNlY2FrZXxlbnwwfHx8fDE3Mjk5OTU1ODd8MA&ixlib=rb-4.0.3&q=80&w=400"),
                Producto(nombre="Cupcake", precio=25.0, precio_grande=30.0, categoria="Repostería", imagen="https://images.unsplash.com/photo-1551024601-bec782825b39?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNjUyOXwwfDF8c2VhcmNofDd8fHZhbmlsbGElMjBjdXBjYWtlfGVufDB8fHx8MTcyOTk5NTYyMnww&ixlib=rb-4.0.3&q=80&w=400"),
                Producto(nombre="Dona", precio=20.0, precio_grande=20.0, categoria="Repostería", imagen="https://images.unsplash.com/photo-1551024506-0bccd828d307?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNjUyOXwwfDF8c2VhcmNofDJ8fGNob2NvbGF0ZSUyMGRvbnV0fGVufDB8fHx8MTcyOTk5NTY0OXww&ixlib=rb-4.0.3&q=80&w=400"),
                Producto(nombre="Sandwich Pavo", precio=30.0, precio_grande=50.0, categoria="Sándwiches", imagen="https://images.unsplash.com/photo-1528607929019-5c91b5a5f129?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNjUyOXwwfDF8c2VhcmNofDR8fHR1cmtleSUyMHNhbmR3aWNofGVufDB8fHx8MTcyOTk5NTY5OHww&ixlib=rb-4.0.3&q=80&w=400"),
                Producto(nombre="Sandwich Club", precio=40.0, precio_grande=60.0, categoria="Sándwiches", imagen="https://images.unsplash.com/photo-1565299543923-37dd37b2238b?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3wzNjUyOXwwfDF8c2VhcmNofDJ8fGNsdWIlMjBzYW5kd2ljaHxlbnwwfHx8fDE3Mjk5OTU3MjJ8MA&ixlib=rb-4.0.3&q=80&w=400")
            ])
            db.session.commit()
    app.run(debug=True)