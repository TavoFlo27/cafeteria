document.addEventListener('DOMContentLoaded', () => {
    const carrito = [];
    const carritoGlobo = document.getElementById('carrito-globo');
    const listaCarrito = document.getElementById('lista-carrito');
    const contadorCarrito = document.getElementById('contador-carrito');
    const totalCarrito = document.getElementById('total-carrito');
    const productosIds = document.getElementById('productos-ids');
    const personalizacionesData = document.getElementById('personalizaciones-data');
    const personalizacionesContainer = document.getElementById('personalizaciones-container');

    // Toggle carrito
    carritoGlobo.addEventListener('click', function(e) {
        if (e.target.closest('.carrito-icono')) {
            this.classList.toggle('activo');
        }
    });

    // Agregar productos al carrito
    document.querySelectorAll('.btn-agregar').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            const nombre = this.dataset.nombre;
            const precio = parseFloat(this.dataset.precio_grande || this.dataset.precio);

            // Verificar si el producto ya está en el carrito
            const existe = carrito.some(item => item.id === id);
            if (existe) {
                alert('Este producto ya está en tu carrito');
                return;
            }

            carrito.push({ id, nombre, precio });
            actualizarCarrito();
            mostrarOpcionesPersonalizacion(id);

            // Feedback visual
            this.textContent = '✓ Agregado';
            setTimeout(() => {
                this.textContent = 'Agregar';
            }, 1000);

            // Mostrar carrito
            carritoGlobo.classList.add('activo');
        });
    });

    // Mostrar opciones de personalización
    function mostrarOpcionesPersonalizacion(productoId) {
        const opciones = `
            <div class="opcion-personalizacion" data-id="${productoId}">
                <h5>${carrito.find(p => p.id === productoId).nombre}</h5>
                <label>
                    Azúcar extra: 
                    <input type="checkbox" name="azucar_${productoId}">
                </label>
                <label>
                    Tipo de leche:
                    <select name="leche_${productoId}">
                        <option value="normal">Normal</option>
                        <option value="deslactosada">Deslactosada</option>
                        <option value="almendra">Almendra</option>
                        <option value="soya">Soya</option>
                    </select>
                </label>
                <label>
                    Notas especiales:
                    <input type="text" name="notas_${productoId}" placeholder="Ej: Sin hielo, extra caliente...">
                </label>
            </div>
        `;
        personalizacionesContainer.insertAdjacentHTML('beforeend', opciones);
    }

    // Actualizar vista del carrito
    function actualizarCarrito() {
        listaCarrito.innerHTML = '';
        let total = 0;
        let personalizacionesTexto = [];

        carrito.forEach(item => {
            const personalizacion = obtenerPersonalizacion(item.id);
            const descripcion = `${item.nombre} ${personalizacion.texto}`;
            personalizacionesTexto.push(`${item.nombre}: ${personalizacion.texto || 'Sin personalización'}`);
            
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${descripcion}</span>
                <span>MX$${item.precio.toFixed(2)}</span>
            `;
            listaCarrito.appendChild(li);
            total += item.precio;
        });

        contadorCarrito.textContent = carrito.length;
        totalCarrito.textContent = `MX$${total.toFixed(2)}`;
        productosIds.value = carrito.map(item => item.id).join(',');
        personalizacionesData.value = personalizacionesTexto.join(' | ');
    }

    // Obtener personalizaciones de un producto
    function obtenerPersonalizacion(productoId) {
        const container = document.querySelector(`.opcion-personalizacion[data-id="${productoId}"]`);
        if (!container) return { texto: '', datos: {} };
        
        let texto = '';
        const datos = {};
        
        // Azúcar extra
        if (container.querySelector(`input[name="azucar_${productoId}"]:checked`)) {
            texto += '(Azúcar extra) ';
            datos.azucar = true;
        }
        
        // Tipo de leche
        const leche = container.querySelector(`select[name="leche_${productoId}"]`).value;
        if (leche !== 'normal') {
            texto += `(Leche ${leche}) `;
            datos.leche = leche;
        }
        
        // Notas especiales
        const notas = container.querySelector(`input[name="notas_${productoId}"]`).value;
        if (notas) {
            texto += `[${notas}]`;
            datos.notas = notas;
        }
        
        return { texto: texto.trim(), datos };
    }

    // Cerrar carrito al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (!carritoGlobo.contains(e.target)) {
            carritoGlobo.classList.remove('activo');
        }
    });

    // Eliminar producto del carrito (opcional)
    listaCarrito.addEventListener('click', function(e) {
        if (e.target.classList.contains('eliminar-producto')) {
            const id = e.target.dataset.id;
            const index = carrito.findIndex(item => item.id === id);
            if (index !== -1) {
                carrito.splice(index, 1);
                actualizarCarrito();
                
                // Eliminar también sus personalizaciones
                const personalizacion = document.querySelector(`.opcion-personalizacion[data-id="${id}"]`);
                if (personalizacion) personalizacion.remove();
            }
        }
    });
});