// Clouddroid FinOps Consulting - Main JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Set current year in footer
    document.getElementById('current-year').textContent = new Date().getFullYear();

    // Mobile menu toggle
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const mobileMenu = document.getElementById('mobile-menu');

    if (mobileMenuBtn && mobileMenu) {
        mobileMenuBtn.addEventListener('click', function() {
            mobileMenu.classList.toggle('hidden');
            // Toggle icon
            const isOpen = !mobileMenu.classList.contains('hidden');
            mobileMenuBtn.innerHTML = isOpen
                ? '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>'
                : '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>';
        });

        // Close mobile menu when clicking a link
        const mobileLinks = mobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', function() {
                mobileMenu.classList.add('hidden');
                mobileMenuBtn.innerHTML = '<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>';
            });
        });
    }

    // Smooth scroll for anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function(e) {
            const href = this.getAttribute('href');
            if (href === '#') return;

            const target = document.querySelector(href);
            if (target) {
                e.preventDefault();
                const headerOffset = 80;
                const elementPosition = target.getBoundingClientRect().top;
                const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

                window.scrollTo({
                    top: offsetPosition,
                    behavior: 'smooth'
                });
            }
        });
    });

    // Contact form handling
    const contactForm = document.getElementById('contact-form');
    if (contactForm) {
        contactForm.addEventListener('submit', function(e) {
            e.preventDefault();

            const submitBtn = contactForm.querySelector('button[type="submit"]');
            const formStatus = document.getElementById('form-status');

            // Basic validation
            const name = document.getElementById('name').value.trim();
            const email = document.getElementById('email').value.trim();
            const message = document.getElementById('message').value.trim();

            if (!name || !email || !message) {
                formStatus.textContent = 'Please fill in all required fields.';
                formStatus.className = 'mt-3 text-sm text-center form-error';
                formStatus.classList.remove('hidden');
                return;
            }

            // Email validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                formStatus.textContent = 'Please enter a valid email address.';
                formStatus.className = 'mt-3 text-sm text-center form-error';
                formStatus.classList.remove('hidden');
                return;
            }

            // Show loading state
            submitBtn.classList.add('btn-loading');
            submitBtn.disabled = true;

            // Simulate form submission (replace with actual endpoint)
            setTimeout(function() {
                submitBtn.classList.remove('btn-loading');
                submitBtn.disabled = false;
                submitBtn.textContent = 'Message Sent';
                submitBtn.classList.remove('bg-navy-900', 'hover:bg-navy-800');
                submitBtn.classList.add('bg-green-600', 'hover:bg-green-700');

                formStatus.textContent = 'Thank you for your enquiry. We will respond within 2 business days.';
                formStatus.className = 'mt-3 text-sm text-center form-success';
                formStatus.classList.remove('hidden');

                // Reset form
                contactForm.reset();

                // Reset button after 5 seconds
                setTimeout(function() {
                    submitBtn.textContent = 'Send Enquiry';
                    submitBtn.classList.remove('bg-green-600', 'hover:bg-green-700');
                    submitBtn.classList.add('bg-navy-900', 'hover:bg-navy-800');
                    formStatus.classList.add('hidden');
                }, 5000);
            }, 1500);
        });
    }

    // Header scroll effect
    const header = document.querySelector('header');
    let lastScroll = 0;

    window.addEventListener('scroll', function() {
        const currentScroll = window.pageYOffset;

        if (currentScroll > 100) {
            header.classList.add('shadow-sm');
        } else {
            header.classList.remove('shadow-sm');
        }

        lastScroll = currentScroll;
    });

    // Intersection Observer for fade-in animations
    if ('IntersectionObserver' in window) {
        const observerOptions = {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
        };

        const observer = new IntersectionObserver(function(entries) {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('fade-in');
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        // Observe service cards and pricing cards
        document.querySelectorAll('.service-card, .pricing-popular').forEach(el => {
            observer.observe(el);
        });
    }

    // Prevent form resubmission on page refresh
    if (window.history.replaceState) {
        window.history.replaceState(null, null, window.location.href);
    }
});
