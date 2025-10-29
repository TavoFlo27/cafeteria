document.addEventListener('DOMContentLoaded', () => {
    // Array del carrito. Ahora guarda objetos con cantidad
    const carrito = []; // Estructura: { carritoId, id, nombre, tamano, precio, cantidad }

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

    // --- LÓGICA DEL MODAL ---

    // Abrir el modal
    document.querySelectorAll('.btn-abrir-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            productoTemporal = {
                id: this.dataset.id,
                nombre: this.dataset.nombre,
                precioChico: parseFloat(this.dataset.precio),
                precioGrande: parseFloat(this.dataset.precio_grande)
            };

            modalNombreProducto.textContent = productoTemporal.nombre;
            modalOpcionesContainer.innerHTML = '';

            const btnChico = document.createElement('button');
            btnChico.type = 'button';
            btnChico.innerHTML = `Chico <span class="precio">MX$${productoTemporal.precioChico.toFixed(2)}</span>`;
            btnChico.dataset.tamano = 'chico';
            btnChico.dataset.precio = productoTemporal.precioChico;
            modalOpcionesContainer.appendChild(btnChico);

            if (productoTemporal.precioGrande && productoTemporal.precioGrande !== productoTemporal.precioChico) {
                const btnGrande = document.createElement('button');
                btnGrande.type = 'button';
                btnGrande.innerHTML = `Grande <span class="precio">MX$${productoTemporal.precioGrande.toFixed(2)}</span>`;
                btnGrande.dataset.tamano = 'grande';
                btnGrande.dataset.precio = productoTemporal.precioGrande;
                modalOpcionesContainer.appendChild(btnGrande);
            }

            modalBackdrop.style.display = 'block';
            modalTamanos.style.display = 'block';
        });
    });

    // Cerrar el modal
    function cerrarModal() {
        modalBackdrop.style.display = 'none';
        modalTamanos.style.display = 'none';
        productoTemporal = null;
    }
    modalBackdrop.addEventListener('click', cerrarModal);

    // Agregar al carrito (Maneja cantidad)
    modalOpcionesContainer.addEventListener('click', function(e) {
        const botonSeleccionado = e.target.closest('button');
        if (!botonSeleccionado) return;

        const tamano = botonSeleccionado.dataset.tamano;
        const precio = parseFloat(botonSeleccionado.dataset.precio);

        // Buscar si ya existe el mismo producto (id y tamaño)
        const itemExistente = carrito.find(item => item.id === productoTemporal.id && item.tamano === tamano);

        if (itemExistente) {
            // Si existe, incrementa la cantidad
            itemExistente.cantidad++;
        } else {
            // Si no existe, lo agrega nuevo con cantidad 1
            const carritoItemId = `${productoTemporal.id}-${tamano}-${Date.now()}`; // ID único
            carrito.push({
                carritoId: carritoItemId,
                id: productoTemporal.id,
                nombre: productoTemporal.nombre,
                tamano: tamano,
                precio: precio,
                cantidad: 1 // Inicia en 1
            });
            // Mostramos personalización solo la primera vez que se agrega
            mostrarOpcionesPersonalizacion(carritoItemId, `${productoTemporal.nombre} (${tamano})`);
        }

        actualizarCarrito(); // Actualiza vista y total
        cerrarModal();
    });

    // --- LÓGICA DEL CARRITO ---

    // Toggle para mostrar/ocultar
    carritoGlobo.addEventListener('click', function(e) {
        if (e.target.closest('.carrito-icono')) {
            if (carrito.length > 0) { // Solo si hay items
                this.classList.toggle('activo');
            }
        }
    });

    // Enviar formulario
    formPedido.addEventListener('submit', function() { actualizarCarrito(); });

    // Mostrar opciones de personalización
    function mostrarOpcionesPersonalizacion(carritoItemId, nombreCompleto) {
        const opciones = `
            <div class="opcion-personalizacion" data-id="${carritoItemId}">
                <h5>${nombreCompleto}</h5>
                <label>
                    Azúcar extra:
                    <input type="checkbox" name="azucar_${carritoItemId}">
                </label>
                <label>
                    Tipo de leche:
                    <select name="leche_${carritoItemId}">
                        <option value="normal">Normal</option>
                        <option value="deslactosada">Deslactosada</option>
                        <option value="almendra">Almendra</option>
                        <option value="soya">Soya</option>
                    </select>
                </label>
                <label>
                    Notas especiales:
                    <input type="text" name="notas_${carritoItemId}" placeholder="Ej: Sin hielo, extra caliente...">
                </label>
            </div>
        `;
        personalizacionesContainer.insertAdjacentHTML('beforeend', opciones);
     }

    // Actualizar vista del carrito (Muestra cantidad y botones +/-)
    function actualizarCarrito() {
        // Controla la visibilidad del icono del carrito
        if (carrito.length > 0) {
            carritoGlobo.style.display = 'block';
        } else {
            carritoGlobo.style.display = 'none';
            carritoGlobo.classList.remove('activo');
        }

        listaCarrito.innerHTML = '';
        let total = 0;
        let personalizacionesTexto = [];
        let productosParaEnviar = [];

        carrito.forEach(item => {
            const nombreCompleto = `${item.nombre} (${item.tamano})`;
            const personalizacion = obtenerPersonalizacion(item.carritoId);
            const descripcion = `${nombreCompleto} ${personalizacion.texto}`;

            const li = document.createElement('li');
            li.innerHTML = `
                <div class="item-info">
                    <span>${descripcion}</span>
                    <br>
                    <small>MX$${item.precio.toFixed(2)} c/u</small>
                </div>
                <div class="item-controles">
                    <button type="button" class="btn-cantidad menos" data-id="${item.carritoId}">-</button>
                    <span class="cantidad">${item.cantidad}</span>
                    <button type="button" class="btn-cantidad mas" data-id="${item.carritoId}">+</button>
                    <button type="button" class="eliminar-producto" data-id="${item.carritoId}">&times;</button>
                </div>
            `;
            listaCarrito.appendChild(li);

            // Multiplicar precio por cantidad para el total
            total += item.precio * item.cantidad;

            // Añadir cantidad al objeto que se envía al backend
            productosParaEnviar.push({
                id: item.id,
                tamano: item.tamano,
                cantidad: item.cantidad
            });

            if (personalizacion.texto) {
                 personalizacionesTexto.push(`${nombreCompleto} x${item.cantidad}: ${personalizacion.texto}`);
            }
        });

        contadorCarrito.textContent = carrito.reduce((sum, item) => sum + item.cantidad, 0); // Suma de cantidades
        totalCarrito.textContent = `MX$${total.toFixed(2)}`;

        productosData.value = JSON.stringify(productosParaEnviar);
        personalizacionesData.value = personalizacionesTexto.join(' | ');
    }

    // Obtener personalizaciones
    function obtenerPersonalizacion(carritoItemId) {
        const container = document.querySelector(`.opcion-personalizacion[data-id="${carritoItemId}"]`);
        if (!container) return { texto: '', datos: {} };
        let texto = '';
        if (container.querySelector(`input[name="azucar_${carritoItemId}"]:checked`)) { texto += '(Azúcar extra) '; }
        const leche = container.querySelector(`select[name="leche_${carritoItemId}"]`).value;
        if (leche !== 'normal') { texto += `(Leche ${leche}) `; }
        const notas = container.querySelector(`input[name="notas_${carritoItemId}"]`).value;
        if (notas) { texto += `[${notas}]`; }
        return { texto: texto.trim() };
     }

    // Cerrar carrito al hacer clic fuera
    document.addEventListener('click', function(e) {
        if (carritoGlobo && !carritoGlobo.contains(e.target)) {
            carritoGlobo.classList.remove('activo');
        }
    });

    // Lógica para botones +/- y eliminar
    listaCarrito.addEventListener('click', function(e) {
        const target = e.target;
        const carritoId = target.dataset.id;
        const itemIndex = carrito.findIndex(item => item.carritoId === carritoId);
        if (itemIndex === -1) return;

        let itemRemoved = false; // Flag para saber si se eliminó el item

        if (target.classList.contains('mas')) {
            carrito[itemIndex].cantidad++;
        } else if (target.classList.contains('menos')) {
            if (carrito[itemIndex].cantidad > 1) {
                carrito[itemIndex].cantidad--;
            } else {
                // Eliminar si la cantidad es 1
                carrito.splice(itemIndex, 1);
                itemRemoved = true;
            }
        } else if (target.classList.contains('eliminar-producto')) {
            // Eliminar directamente
            carrito.splice(itemIndex, 1);
            itemRemoved = true;
        }

        // Si se eliminó el item, también quitar su personalización del DOM
        if (itemRemoved) {
            const personalizacion = document.querySelector(`.opcion-personalizacion[data-id="${carritoId}"]`);
            if (personalizacion) personalizacion.remove();
        }

        // Actualizar la vista si hubo cambios
        if (target.classList.contains('mas') || target.classList.contains('menos') || target.classList.contains('eliminar-producto')) {
            actualizarCarrito();
        }
    });
});