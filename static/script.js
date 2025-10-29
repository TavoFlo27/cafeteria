document.addEventListener('DOMContentLoaded', () => {
    // Array del carrito: { carritoId, id, nombre, tamano, precio, cantidad }
    const carrito = [];

    // Referencias al DOM (Carrito)
    const carritoGlobo = document.getElementById('carrito-globo');
    const listaCarrito = document.getElementById('lista-carrito');
    const contadorCarrito = document.getElementById('contador-carrito');
    const totalCarrito = document.getElementById('total-carrito');
    const productosData = document.getElementById('productos-data');
    const personalizacionesData = document.getElementById('personalizaciones-data');
    const personalizacionesContainer = document.getElementById('personalizaciones-container');

    // Referencias al DOM (Formulario)
    const formPedido = document.getElementById('form-pedido');

    // Referencias al DOM (Modal)
    const modalBackdrop = document.getElementById('modal-backdrop');
    const modalTamanos = document.getElementById('modal-tamanos');
    const modalNombreProducto = document.getElementById('modal-nombre-producto');
    const modalOpcionesContainer = document.getElementById('modal-opciones-container');

    let productoTemporal = null;


    // --- LÓGICA DEL MODAL (Para productos CON tamaño: Bebidas) ---
    document.querySelectorAll('.btn-abrir-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            modalBackdrop.style.display = 'block';
            modalTamanos.style.display = 'block';

            const id = this.dataset.id;
            const nombre = this.dataset.nombre;
            const precioChico = parseFloat(this.dataset.precio);
            const precioGrande = parseFloat(this.dataset.precio_grande);

            modalNombreProducto.textContent = nombre;
            
            // Almacenar temporalmente los datos
            productoTemporal = { id, nombre, precioChico, precioGrande };

            // Renderizar opciones de tamaño
            modalOpcionesContainer.innerHTML = `
                <button data-tamano="chico" data-precio="${precioChico}">Chico (MX$${precioChico.toFixed(2)})</button>
                <button data-tamano="grande" data-precio="${precioGrande}">Grande (MX$${precioGrande.toFixed(2)})</button>
            `;
        });
    });

    function cerrarModal() {
        modalBackdrop.style.display = 'none';
        modalTamanos.style.display = 'none';
        productoTemporal = null;
    }
    modalBackdrop.addEventListener('click', cerrarModal);

    // Manejar selección de tamaño en el modal
    modalOpcionesContainer.addEventListener('click', function(e) {
        if (e.target.tagName === 'BUTTON') {
            const tamano = e.target.dataset.tamano;
            const precio = parseFloat(e.target.dataset.precio);
            const id = productoTemporal.id;

            const carritoItemId = `${id}-${tamano}-${Date.now()}`;
            
            const itemExistente = carrito.find(item => item.id === id && item.tamano === tamano);
            
            if (itemExistente) {
                itemExistente.cantidad++;
            } else {
                carrito.push({
                    carritoId: carritoItemId, id: id, nombre: productoTemporal.nombre,
                    tamano: tamano, 
                    precio: precio, cantidad: 1
                });
                // Pasar 'Bebidas' como categoría
                mostrarOpcionesPersonalizacion(carritoItemId, `${productoTemporal.nombre} (${tamano})`, 'Bebidas'); 
            }
            actualizarCarrito();
            cerrarModal();
        }
    });

    // --- LÓGICA PARA AGREGAR DIRECTO (Productos SIN tamaño) ---
    document.querySelectorAll('.btn-agregar-directo').forEach(btn => {
        btn.addEventListener('click', function() {
            const id = this.dataset.id;
            const nombre = this.dataset.nombre;
            const precio = parseFloat(this.dataset.precio);
            const tamano = 'unico'; 
            const categoria = this.dataset.categoria; // Obtener la categoría

            const itemExistente = carrito.find(item => item.id === id && item.tamano === tamano);

            if (itemExistente) {
                itemExistente.cantidad++;
            } else {
                const carritoItemId = `${id}-${tamano}-${Date.now()}`;
                carrito.push({
                    carritoId: carritoItemId,
                    id: id,
                    nombre: nombre,
                    tamano: tamano, 
                    precio: precio,
                    cantidad: 1 
                });
                // Pasar la categoría obtenida
                mostrarOpcionesPersonalizacion(carritoItemId, nombre, categoria); 
            }
            actualizarCarrito(); 
            
            // Feedback visual
            this.textContent = '✓';
            this.style.backgroundColor = '#4CAF50'; 
            setTimeout(() => { 
                this.textContent = 'Agregar';
                this.style.backgroundColor = 'var(--accent)';
            }, 1000);
        });
    });

    // --- LÓGICA DEL CARRITO ---

    // Función de personalización con lógica de categoría
    function mostrarOpcionesPersonalizacion(carritoItemId, nombreMostrado, categoria) {
        let contenidoOpciones = `
            <label>Notas especiales: <input type="text" name="notas_${carritoItemId}" placeholder="Sin vainilla..."></label>
        `;

        // Solo incluir opciones de café/bebidas si la categoría es "Bebidas"
        if (categoria === 'Bebidas') {
            contenidoOpciones = `
                <label>Azúcar extra: <input type="checkbox" name="azucar_${carritoItemId}"></label>
                <label>Tipo de leche: 
                    <select name="leche_${carritoItemId}">
                        <option value="entera">Entera</option>
                        <option value="deslactosada">Deslactosada</option>
                        <option value="almendra">Almendra</option>
                    </select>
                </label>
                ${contenidoOpciones}
            `;
        }
        
        const opciones = `
            <div class="opcion-personalizacion" data-id="${carritoItemId}">
                <h5>${nombreMostrado}</h5>
                ${contenidoOpciones}
            </div>`;
            
        personalizacionesContainer.insertAdjacentHTML('beforeend', opciones);
    }

    // Toggle
    carritoGlobo.addEventListener('click', function(e) {
        if (!e.target.closest('.carrito-contenido')) {
            this.classList.toggle('activo');
        }
    });

    // Enviar formulario (antes de enviar, asegúrate de actualizar los campos ocultos)
    formPedido.addEventListener('submit', function() {
        actualizarCarrito();
        if (carrito.length === 0) {
            alert('El carrito está vacío.');
            e.preventDefault();
        }
    });
    
    // Actualizar vista del carrito
    function actualizarCarrito() {
        // Muestra/Oculta el globo
        if (carrito.length > 0) { carritoGlobo.style.display = 'block'; }
        else { carritoGlobo.style.display = 'none'; carritoGlobo.classList.remove('activo'); }

        listaCarrito.innerHTML = '';
        let total = 0;
        let personalizacionesTexto = [];
        let productosParaEnviar = [];

        carrito.forEach(item => {
            // Decide si mostrar el tamaño en la descripción
            const nombreMostrado = item.tamano === 'unico' ? item.nombre : `${item.nombre} (${item.tamano})`;
            const personalizacion = obtenerPersonalizacion(item.carritoId);
            const descripcion = `${nombreMostrado} ${personalizacion.texto}`;

            const li = document.createElement('li');
            li.innerHTML = `
                <div class="item-info">
                    <span>${descripcion}</span><br>
                    <small>MX$${item.precio.toFixed(2)} c/u</small>
                </div>
                <div class="item-controles">
                    <button type="button" class="btn-cantidad menos" data-id="${item.carritoId}">-</button>
                    <span class="cantidad">${item.cantidad}</span>
                    <button type="button" class="btn-cantidad mas" data-id="${item.carritoId}">+</button>
                    <button type="button" class="eliminar-producto" data-id="${item.carritoId}">&times;</button>
                </div>`;
            listaCarrito.appendChild(li);

            total += item.precio * item.cantidad;

            // Datos para enviar al servidor
            productosParaEnviar.push({
                id: parseInt(item.id), 
                tamano: item.tamano, 
                cantidad: item.cantidad
            });

            if (personalizacion.texto) {
                 personalizacionesTexto.push(`${nombreMostrado} x${item.cantidad}: ${personalizacion.texto}`);
            }
            
            // Ocultar/Mostrar la personalización en el área de edición
            const opcionPersonalizacionElement = document.querySelector(`.opcion-personalizacion[data-id="${item.carritoId}"]`);
            if (opcionPersonalizacionElement) {
                opcionPersonalizacionElement.style.display = item.cantidad > 0 ? 'block' : 'none';
            }
        });

        contadorCarrito.textContent = carrito.reduce((sum, item) => sum + item.cantidad, 0);
        totalCarrito.textContent = `MX$${total.toFixed(2)}`;
        productosData.value = JSON.stringify(productosParaEnviar);
        personalizacionesData.value = personalizacionesTexto.join(' | ');
    }

    // Obtener personalizaciones de los inputs
    function obtenerPersonalizacion(carritoItemId) {
        const form = document.getElementById('form-pedido');
        let texto = [];

        const azucar = form.querySelector(`input[name="azucar_${carritoItemId}"]`);
        if (azucar && azucar.checked) texto.push('Azúcar extra');

        const leche = form.querySelector(`select[name="leche_${carritoItemId}"]`);
        if (leche && leche.value !== 'entera') texto.push(`Leche: ${leche.value}`);

        const notas = form.querySelector(`input[name="notas_${carritoItemId}"]`);
        if (notas && notas.value.trim()) texto.push(`Notas: ${notas.value.trim()}`);

        return { texto: texto.join(', '), elementos: { azucar, leche, notas } };
    }

    // Lógica +/-/X
    listaCarrito.addEventListener('click', function(e) {
        if (e.target.classList.contains('btn-cantidad') || e.target.classList.contains('eliminar-producto')) {
            const itemId = e.target.dataset.id;
            const itemIndex = carrito.findIndex(item => item.carritoId === itemId);

            if (itemIndex === -1) return;

            if (e.target.classList.contains('mas')) {
                carrito[itemIndex].cantidad++;
            } else if (e.target.classList.contains('menos')) {
                carrito[itemIndex].cantidad--;
            } else if (e.target.classList.contains('eliminar-producto')) {
                carrito[itemIndex].cantidad = 0; // Marcar para eliminar

                 // Eliminar la opción de personalización del DOM
                const opcionPersonalizacionElement = document.querySelector(`.opcion-personalizacion[data-id="${itemId}"]`);
                if (opcionPersonalizacionElement) {
                    opcionPersonalizacionElement.remove();
                }
            }

            if (carrito[itemIndex].cantidad <= 0) {
                carrito.splice(itemIndex, 1);
            }

            actualizarCarrito();
        }
    });
});