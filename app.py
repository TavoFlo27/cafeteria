from flask import Flask, render_template, request, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta

app = Flask(__name__)
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///database.db'
db = SQLAlchemy(app)

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

@app.route('/')
def index():
    productos = Producto.query.all()
    return render_template('index.html', productos=productos, busqueda=None)

@app.route('/crear_pedido', methods=['POST'])
def crear_pedido():
    cliente = request.form['cliente']
    productos_ids = request.form.getlist('productos')
    metodo_pago = request.form.get('metodo_pago', 'efectivo')
    personalizaciones = request.form.get('personalizaciones', '')
    
    productos = []
    precios = []
    for id in productos_ids:
        producto = Producto.query.get(int(id))
        productos.append(producto.nombre)
        precios.append(producto.precio)
    
    total = sum(precios)
    
    nuevo_pedido = Pedido(
        cliente=cliente,
        productos=", ".join(productos) + " | " + personalizaciones,
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

@app.route('/barista')
def barista():
    pedidos = Pedido.query.filter(Pedido.pago == "pagado", Pedido.estado != "terminado").order_by(Pedido.hora_pago).all()
    ahora = datetime.now()
    for pedido in pedidos:
        if pedido.hora_preparacion and ahora >= pedido.hora_preparacion and pedido.estado != "listo":
            pedido.estado = "listo"
            db.session.commit()
    return render_template('barista.html', pedidos=pedidos, ahora=ahora)

@app.route('/actualizar_estado/<int:id>', methods=['POST'])
def actualizar_estado(id):
    pedido = Pedido.query.get(id)
    pedido.estado = request.form['estado']
    if pedido.estado == "terminado":
        pedido.hora_preparacion = None
    db.session.commit()
    return redirect(url_for('barista'))

@app.route('/cajero')
def cajero():
    pedidos = Pedido.query.filter(Pedido.estado != "terminado").order_by(Pedido.fecha.desc()).all()
    return render_template('cajero.html', pedidos=pedidos)

@app.route('/actualizar_pago/<int:id>', methods=['POST'])
def actualizar_pago(id):
    pedido = Pedido.query.get(id)
    pedido.pago = request.form['pago']
    if pedido.pago == "pagado":
        pedido.hora_pago = datetime.now()
        pedido.hora_preparacion = datetime.now() + timedelta(minutes=15)
        pedido.estado = "en preparación"
    db.session.commit()
    return redirect(url_for('cajero'))

@app.route('/seguimiento/<int:id_pedido>')
def seguimiento(id_pedido):
    pedido = Pedido.query.get(id_pedido)
    return render_template('seguimiento.html', pedido=pedido)

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