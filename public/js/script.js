$(document).ready(function() {
    let yearNow = new Date().getFullYear()
    $('#year').text(yearNow)

    const loginWithGoogle = () => {
        window.open('https://cyberproexample.onrender.com/auth/google','_self')
    }
    $('.login-with-google-btn').click(loginWithGoogle)

    const $items = $('.page');
    const $itUnderline = $('.itUnderline')
  
    function checkVisibility() {
      $items.each(function() {
        const $this = $(this);
        const offsetTop = $this.offset().top;
        const scrollTop = $(window).scrollTop();
        const windowHeight = $(window).height();
  
        if (offsetTop < scrollTop + windowHeight - 50) { // Adjust the threshold as needed
          $this.addClass('show');
          $itUnderline.addClass('underlinedIT')
        }
      });
    }
  
    $(window).on('scroll', checkVisibility);
    checkVisibility(); // Initial check on page load
});