/* * ==========================================
 * SCRIPT PARA EL PUNTO DE VENTA (POS.JS)
 * ==========================================
 * Es una copia de 'script.js' pero adaptada
 * a los IDs de 'cajero.html' (ej: 'lista-carrito-pos')
 */

document.addEventListener('DOMContentLoaded', () => {
    // Array del carrito (local para el POS)
    const carrito = [];
    
    // Referencias al DOM (Carrito del POS)
    const listaCarrito = document.getElementById('lista-carrito-pos');
    const totalCarrito = document.getElementById('total-carrito-pos');
    const productosData = document.getElementById('productos-data-pos'); 
    const personalizacionesData = document.getElementById('personalizaciones-data-pos');
    const personalizacionesContainer = document.getElementById('personalizaciones-container-pos');
    
    // Referencias al DOM (Formulario del POS)
    const formPedido = document.getElementById('form-pedido-pos');
    
    // Referencias al DOM (Modal del POS)
    const modalBackdrop = document.getElementById('modal-backdrop-pos');
    const modalTamanos = document.getElementById('modal-tamanos-pos');
    const modalNombreProducto = document.getElementById('modal-nombre-producto-pos');
    const modalOpcionesContainer = document.getElementById('modal-opciones-container-pos');
    
    let productoTemporal = null;

    // --- LÓGICA DEL MODAL ---

    // 1. Abrir el modal al hacer clic en 'btn-abrir-modal-pos'
    document.querySelectorAll('.btn-abrir-modal-pos').forEach(btn => {
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

    // 2. Cerrar el modal
    function cerrarModal() {
        modalBackdrop.style.display = 'none';
        modalTamanos.style.display = 'none';
        productoTemporal = null;
    }
    modalBackdrop.addEventListener('click', cerrarModal);

    // 3. Agregar al carrito
    modalOpcionesContainer.addEventListener('click', function(e) {
        const botonSeleccionado = e.target.closest('button');
        if (!botonSeleccionado) return;

        const tamano = botonSeleccionado.dataset.tamano;
        const precio = parseFloat(botonSeleccionado.dataset.precio);

        const existe = carrito.some(item => item.id === productoTemporal.id && item.tamano === tamano);
        if (existe) {
            alert('Este producto con este tamaño ya está en tu carrito');
            return;
        }

        const carritoItemId = `${productoTemporal.id}-${tamano}-${Date.now()}`;

        carrito.push({
            carritoId: carritoItemId, 
            id: productoTemporal.id,  
            nombre: productoTemporal.nombre,
            tamano: tamano,
            precio: precio
        });
        
        actualizarCarrito();
        mostrarOpcionesPersonalizacion(carritoItemId, `${productoTemporal.nombre} (${tamano})`);
        
        cerrarModal();
    });


    // --- LÓGICA DEL CARRITO ---

    // Actualiza los datos ocultos justo antes de enviar el formulario
    formPedido.addEventListener('submit', function() {
        actualizarCarrito();
        // Nota: El carrito se vaciará automáticamente cuando la página se recargue
        // después de enviar el formulario.
    });

    // Muestra las opciones de personalización para un item
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
                    <input type="text" name="notas_${carritoItemId}" placeholder="Ej: Sin hielo...">
                </label>
            </div>
        `;
        // Usamos 'personalizacionesContainer' que apunta a '#personalizaciones-container-pos'
        personalizacionesContainer.insertAdjacentHTML('beforeend', opciones);
    }

    // Actualiza la vista del carrito (lista, total) y los inputs ocultos
    function actualizarCarrito() {
        listaCarrito.innerHTML = '';
        let total = 0;
        let personalizacionesTexto = [];
        let productosParaEnviar = []; 

        carrito.forEach(item => {
            const nombreCompleto = `${item.nombre} (${item.tamano})`;
            const personalizacion = obtenerPersonalizacion(item.carritoId);
            const descripcion = `${nombreCompleto} ${personalizacion.texto}`;
            
            if (personalizacion.texto) {
                 personalizacionesTexto.push(`${nombreCompleto}: ${personalizacion.texto}`);
            }
           
            const li = document.createElement('li');
            li.innerHTML = `
                <span>${descripcion} (MX$${item.precio.toFixed(2)})</span>
                <button type="button" class="eliminar-producto-pos" data-id="${item.carritoId}">&times;</button>
            `;
            listaCarrito.appendChild(li);
            total += item.precio;

            productosParaEnviar.push({
                id: item.id,
                tamano: item.tamano
            });
        });

        totalCarrito.textContent = `MX$${total.toFixed(2)}`;
        
        productosData.value = JSON.stringify(productosParaEnviar);
        personalizacionesData.value = personalizacionesTexto.join(' | ');
    }

    // Obtiene el texto de las personalizaciones de un item
    function obtenerPersonalizacion(carritoItemId) {
        const container = document.querySelector(`.opcion-personalizacion[data-id="${carritoItemId}"]`);
        if (!container) return { texto: '', datos: {} };
        
        let texto = '';
        
        if (container.querySelector(`input[name="azucar_${carritoItemId}"]:checked`)) {
            texto += '(Azúcar extra) ';
        }
        const leche = container.querySelector(`select[name="leche_${carritoItemId}"]`).value;
        if (leche !== 'normal') {
            texto += `(Leche ${leche}) `;
        }
        const notas = container.querySelector(`input[name="notas_${carritoItemId}"]`).value;
        if (notas) {
            texto += `[${notas}]`;
        }
        
        return { texto: texto.trim() };
    }

    // Lógica para el botón de eliminar producto del carrito
    listaCarrito.addEventListener('click', function(e) {
        if (e.target.classList.contains('eliminar-producto-pos')) {
            const carritoId = e.target.dataset.id;
            
            const index = carrito.findIndex(item => item.carritoId === carritoId);
            if (index !== -1) {
                carrito.splice(index, 1);
            }
            
            const personalizacion = document.querySelector(`.opcion-personalizacion[data-id="${carritoId}"]`);
            if (personalizacion) {
                personalizacion.remove();
            }

            actualizarCarrito();
        }
    });
});