document.addEventListener('DOMContentLoaded', () => {
    const carrito = [];
    const carritoGlobo = document.getElementById('carrito-globo');
    const listaCarrito = document.getElementById('lista-carrito');
    const contadorCarrito = document.getElementById('contador-carrito');
    const totalCarrito = document.getElementById('total-carrito');
    const productosIds = document.getElementById('productos-ids');
    const personalizacionesData = document.getElementById('personalizaciones-data');
    const personalizacionesContainer = document.getElementById('personalizaciones-container');
    
    // --- CORRECCIÓN ---
    // Referencias al formulario y al input de método de pago
    const formPedido = document.getElementById('form-pedido');
    const metodoPagoInput = document.getElementById('metodo_pago-data');
    const opcionesPagoRadios = document.querySelectorAll('input[name="metodo_pago"]');

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
            // CORRECCIÓN: Asegurar que el precio grande es un número
            const precio = parseFloat(this.dataset.precio_grande || this.dataset.precio);

            // Verificar si el producto ya está en el carrito
            const existe = carrito.some(item => item.id === id);
            if (existe) {
                alert('Este producto ya está en tu carrito');
                return;
            }

            carrito.push({ id, nombre, precio });
            actualizarCarrito();
            mostrarOpcionesPersonalizacion(id); // La función original está bien

            // Feedback visual
            this.textContent = '✓ Agregado';
            setTimeout(() => {
                this.textContent = 'Agregar';
            }, 1000);

            // Mostrar carrito
            carritoGlobo.classList.add('activo');
        });
    });

    // --- CORRECCIÓN: Actualizar el input oculto cuando cambia el radio button ---
    opcionesPagoRadios.forEach(radio => {
        radio.addEventListener('change', function() {
            metodoPagoInput.value = this.value;
        });
    });

    // --- CORRECCIÓN: Actualizar personalizaciones antes de enviar ---
    formPedido.addEventListener('submit', function() {
        // Llama a actualizarCarrito() una última vez para asegurar que
        // los datos de personalización están actualizados en el input oculto.
        actualizarCarrito(); 
    });


    // Mostrar opciones de personalización (Sin cambios)
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

    // Actualizar vista del carrito (Sin cambios en lógica principal)
    function actualizarCarrito() {
        listaCarrito.innerHTML = '';
        let total = 0;
        let personalizacionesTexto = [];

        carrito.forEach(item => {
            // CORRECCIÓN: Llamar a 'obtenerPersonalizacion' aquí para 
            // asegurar que los datos de 'personalizacionesData' estén actualizados.
            const personalizacion = obtenerPersonalizacion(item.id);
            const descripcion = `${item.nombre} ${personalizacion.texto}`;
            
            // Solo añadir a 'personalizacionesTexto' si tiene personalización
            if (personalizacion.texto) {
                 personalizacionesTexto.push(`${item.nombre}: ${personalizacion.texto}`);
            }
           
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
        // Esto envía los IDs "1,2,3", que el backend ahora maneja correctamente
        productosIds.value = carrito.map(item => item.id).join(',');
        // Esto envía el texto de personalizaciones
        personalizacionesData.value = personalizacionesTexto.join(' | ');
    }

    // Obtener personalizaciones de un producto (Sin cambios)
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

    // Cerrar carrito al hacer clic fuera (Sin cambios)
    document.addEventListener('click', function(e) {
        if (!carritoGlobo.contains(e.target)) {
            carritoGlobo.classList.remove('activo');
        }
    });
    
    // (Tu script no incluía lógica para eliminar, pero la dejaste comentada
    // en la función. La lógica de eliminación requeriría más cambios
    // para remover el item del array 'carrito' y el HTML de personalización)
});